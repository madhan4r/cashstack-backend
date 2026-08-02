import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { TransactionType } from '../../transactions/enums';
import { HouseholdService } from '../../household/household.service';
import { Account } from '../schemas/account.schema';
import { AccountBalanceAggregate } from '../interfaces';

export interface AccountBalanceOptions {
  /** Restrict the computation to a single account. */
  accountId?: string;
  /** Only sum ledger entries dated strictly before this instant (defaults to "now", i.e. all entries). */
  asOf?: Date;
  /** Include archived accounts (soft-deleted accounts are always excluded). Defaults to false. */
  includeArchived?: boolean;
}

/**
 * Computes account balances (opening balance plus the net effect of every
 * income/expense/transfer transaction) directly from the Accounts and
 * Transactions collections via aggregation. No balance is ever persisted.
 *
 * Shared by the Dashboard and Reports modules so the ledger pipeline is
 * defined in exactly one place.
 */
@Injectable()
export class AccountBalanceService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly householdService: HouseholdService,
  ) {}

  async getAccountBalances(
    userId: string,
    options: AccountBalanceOptions = {},
  ): Promise<AccountBalanceAggregate[]> {
    const scopeObjectIds = (
      await this.householdService.getAccessibleUserIds(userId)
    ).map((id) => new Types.ObjectId(id));

    const accountMatch: Record<string, unknown> = {
      userId: { $in: scopeObjectIds },
      isDeleted: false,
    };

    const includeArchived = options.includeArchived ?? Boolean(options.asOf);

    if (options.accountId) {
      accountMatch._id = new Types.ObjectId(options.accountId);
    } else if (!includeArchived) {
      accountMatch.isArchived = false;
    }

    const ledgerDateFilter = options.asOf
      ? [{ $lt: ['$transactionDate', options.asOf] }]
      : [];

    const pipeline: PipelineStage[] = [
      { $match: accountMatch },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // Not `$eq` to a single owner — a household member can
                    // create a transaction against another member's account,
                    // so the ledger entry's own userId no longer has to
                    // match the account's owner, just be someone in scope.
                    { $in: ['$userId', scopeObjectIds] },
                    {
                      $or: [
                        { $eq: ['$accountId', '$$accountId'] },
                        { $eq: ['$fromAccountId', '$$accountId'] },
                        { $eq: ['$toAccountId', '$$accountId'] },
                      ],
                    },
                    ...ledgerDateFilter,
                  ],
                },
              },
            },
            {
              $project: {
                signedAmount: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$type', TransactionType.INCOME] },
                        then: '$amount',
                      },
                      {
                        case: { $eq: ['$type', TransactionType.EXPENSE] },
                        then: { $multiply: ['$amount', -1] },
                      },
                      {
                        case: { $eq: ['$toAccountId', '$$accountId'] },
                        then: '$amount',
                      },
                      {
                        case: { $eq: ['$fromAccountId', '$$accountId'] },
                        then: { $multiply: ['$amount', -1] },
                      },
                    ],
                    default: 0,
                  },
                },
              },
            },
          ],
          as: 'ledgerEntries',
        },
      },
      {
        $addFields: {
          balance: {
            $add: ['$openingBalance', { $sum: '$ledgerEntries.signedAmount' }],
          },
        },
      },
      {
        $project: {
          name: 1,
          type: 1,
          currency: 1,
          color: 1,
          icon: 1,
          balance: 1,
        },
      },
      { $sort: { name: 1 } },
    ];

    return this.accountModel.aggregate<AccountBalanceAggregate>(pipeline);
  }

  async getCurrentBalance(
    userId: string,
    options: AccountBalanceOptions = {},
  ): Promise<number> {
    const balances = await this.getAccountBalances(userId, options);
    return balances.reduce((sum, account) => sum + account.balance, 0);
  }

  /**
   * Total income/expense and transaction count for a single account, used
   * by the Account Details screen. "Income" is every ledger entry that
   * increases the account's balance (INCOME transactions plus incoming
   * transfers); "expense" is every entry that decreases it (EXPENSE
   * transactions plus outgoing transfers) — the same signed-amount ledger
   * used by [getAccountBalances], just split by sign instead of summed.
   */
  async getAccountStats(
    userId: string,
    accountId: string,
  ): Promise<AccountStats | null> {
    const scopeObjectIds = (
      await this.householdService.getAccessibleUserIds(userId)
    ).map((id) => new Types.ObjectId(id));
    const accountObjectId = new Types.ObjectId(accountId);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          _id: accountObjectId,
          userId: { $in: scopeObjectIds },
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$userId', scopeObjectIds] },
                    {
                      $or: [
                        { $eq: ['$accountId', '$$accountId'] },
                        { $eq: ['$fromAccountId', '$$accountId'] },
                        { $eq: ['$toAccountId', '$$accountId'] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                signedAmount: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$type', TransactionType.INCOME] },
                        then: '$amount',
                      },
                      {
                        case: { $eq: ['$type', TransactionType.EXPENSE] },
                        then: { $multiply: ['$amount', -1] },
                      },
                      {
                        case: { $eq: ['$toAccountId', '$$accountId'] },
                        then: '$amount',
                      },
                      {
                        case: { $eq: ['$fromAccountId', '$$accountId'] },
                        then: { $multiply: ['$amount', -1] },
                      },
                    ],
                    default: 0,
                  },
                },
              },
            },
          ],
          as: 'ledgerEntries',
        },
      },
      {
        $addFields: {
          balance: {
            $add: ['$openingBalance', { $sum: '$ledgerEntries.signedAmount' }],
          },
          totalIncome: {
            $sum: {
              $filter: {
                input: '$ledgerEntries.signedAmount',
                as: 'entry',
                cond: { $gt: ['$$entry', 0] },
              },
            },
          },
          totalExpense: {
            $abs: {
              $sum: {
                $filter: {
                  input: '$ledgerEntries.signedAmount',
                  as: 'entry',
                  cond: { $lt: ['$$entry', 0] },
                },
              },
            },
          },
          transactionCount: { $size: '$ledgerEntries' },
        },
      },
      {
        $project: {
          balance: 1,
          totalIncome: 1,
          totalExpense: 1,
          transactionCount: 1,
        },
      },
    ];

    const [result] = await this.accountModel.aggregate<AccountStats>(pipeline);
    return result ?? null;
  }
}

export interface AccountStats {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}
