import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountBalanceService } from '../accounts/services/account-balance.service';
import { AccountBalanceAggregate } from '../accounts/interfaces';
import { AccountType } from '../accounts/enums';
import { BudgetService } from '../budget/budget.service';
import { ExchangeRateService } from '../currency/exchange-rate.service';
import { Transaction } from '../transactions/schemas/transaction.schema';
import { TransactionType } from '../transactions/enums';
import { getLastNMonths, getUtcMonthRange } from '../common/utils';
import { HouseholdService } from '../household/household.service';
import { UsersService } from '../users/users.service';
import {
  AccountSummaryDto,
  DashboardDataDto,
  DashboardTransactionDto,
  ExpenseByCategoryDto,
  MonthlyTrendDto,
} from './dto/dashboard-response.dto';
import { MonthlyTrendAggregate, TransactionFacetResult } from './interfaces';

const RECENT_TRANSACTIONS_LIMIT = 10;
const MONTHLY_TREND_MONTHS = 6;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly accountBalanceService: AccountBalanceService,
    private readonly budgetService: BudgetService,
    private readonly householdService: HouseholdService,
    private readonly usersService: UsersService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardDataDto> {
    // Resolved once and handed to every branch below — each of them would
    // otherwise independently re-resolve it via HouseholdService, tripling
    // the number of Mongo round-trips this endpoint makes for no reason.
    const scopeUserIds =
      await this.householdService.getAccessibleUserIds(userId);
    const user = await this.usersService.findById(userId);
    const targetCurrency = user.preferredCurrency;

    const [transactionFacets, accountBalances, monthlyBudget] =
      await Promise.all([
        this.getTransactionFacets(scopeUserIds),
        this.accountBalanceService.getAccountBalances(userId, {
          scopeUserIds,
        }),
        this.budgetService.getAggregateAmount(userId, scopeUserIds),
      ]);

    // Every account balance/transaction keeps its own account's currency —
    // only these aggregate totals (mixing accounts of different
    // currencies into one figure) need converting. See ExchangeRateService.
    const currentBalance = accountBalances.reduce(
      (sum, account) =>
        sum +
        this.exchangeRateService.convert(
          account.balance,
          account.currency,
          targetCurrency,
        ),
      0,
    );

    const monthlyIncome = this.sumConverted(
      transactionFacets.monthlyStats.filter(
        (stat) => stat._id.type === TransactionType.INCOME,
      ),
      targetCurrency,
    );
    const monthlyExpense = this.sumConverted(
      transactionFacets.monthlyStats.filter(
        (stat) => stat._id.type === TransactionType.EXPENSE,
      ),
      targetCurrency,
    );

    return {
      currentBalance,
      monthlyIncome,
      monthlyExpense,
      monthlySavings: monthlyIncome - monthlyExpense,
      monthlyBudget,
      budgetRemaining:
        monthlyBudget != null ? monthlyBudget - monthlyExpense : 0,
      recentTransactions: this.mapRecentTransactions(
        transactionFacets.recentTransactions,
      ),
      expenseByCategory: this.mapExpenseByCategory(
        transactionFacets.expenseByCategory,
        monthlyExpense,
        targetCurrency,
      ),
      accountSummary: this.mapAccountSummary(accountBalances),
      monthlyTrend: this.buildMonthlyTrend(
        transactionFacets.monthlyTrend,
        targetCurrency,
      ),
    };
  }

  /** Sums a list of same-shape `{ _id: { currency }, total }` buckets after
   * converting each into `targetCurrency` — the one place every currency
   * aggregate in this service funnels through. */
  private sumConverted(
    buckets: { _id: { currency: string }; total: number }[],
    targetCurrency: string,
  ): number {
    return buckets.reduce(
      (sum, bucket) =>
        sum +
        this.exchangeRateService.convert(
          bucket.total,
          bucket._id.currency,
          targetCurrency,
        ),
      0,
    );
  }

  private async getTransactionFacets(
    scopeUserIds: string[],
  ): Promise<TransactionFacetResult> {
    const scopeObjectIds = scopeUserIds.map((id) => new Types.ObjectId(id));
    const now = new Date();
    const { start: monthStart, end: monthEnd } = getUtcMonthRange(now);
    const trendMonths = getLastNMonths(MONTHLY_TREND_MONTHS, now);
    const trendStart = new Date(
      Date.UTC(trendMonths[0].year, trendMonths[0].month - 1, 1),
    );

    const pipeline: PipelineStage[] = [
      { $match: { userId: { $in: scopeObjectIds } } },
      {
        $facet: {
          recentTransactions: [
            { $sort: { transactionDate: -1, createdAt: -1 } },
            { $limit: RECENT_TRANSACTIONS_LIMIT },
            {
              $lookup: {
                from: 'accounts',
                localField: 'accountId',
                foreignField: '_id',
                as: 'accountDoc',
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryDoc',
              },
            },
            {
              $project: {
                amount: 1,
                type: 1,
                notes: 1,
                paymentMethod: 1,
                transactionDate: 1,
                accountName: {
                  $arrayElemAt: ['$accountDoc.name', 0],
                },
                categoryName: { $arrayElemAt: ['$categoryDoc.name', 0] },
                categoryIcon: { $arrayElemAt: ['$categoryDoc.icon', 0] },
                categoryColor: { $arrayElemAt: ['$categoryDoc.color', 0] },
              },
            },
          ],
          monthlyStats: [
            {
              $match: {
                transactionDate: { $gte: monthStart, $lt: monthEnd },
                type: {
                  $in: [TransactionType.INCOME, TransactionType.EXPENSE],
                },
              },
            },
            ...this.currencyLookupStages(),
            {
              $group: {
                _id: { type: '$type', currency: '$currency' },
                total: { $sum: '$amount' },
              },
            },
          ],
          expenseByCategory: [
            {
              $match: {
                transactionDate: { $gte: monthStart, $lt: monthEnd },
                type: TransactionType.EXPENSE,
                categoryId: { $ne: null },
              },
            },
            ...this.currencyLookupStages(),
            {
              $group: {
                _id: { categoryId: '$categoryId', currency: '$currency' },
                total: { $sum: '$amount' },
                transactionCount: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: '_id.categoryId',
                foreignField: '_id',
                as: 'category',
              },
            },
            { $unwind: '$category' },
            {
              $project: {
                total: 1,
                transactionCount: 1,
                categoryName: '$category.name',
                categoryIcon: '$category.icon',
                categoryColor: '$category.color',
              },
            },
            { $sort: { total: -1 } },
          ],
          monthlyTrend: [
            {
              $match: {
                transactionDate: { $gte: trendStart, $lt: monthEnd },
                type: {
                  $in: [TransactionType.INCOME, TransactionType.EXPENSE],
                },
              },
            },
            ...this.currencyLookupStages(),
            {
              $group: {
                _id: {
                  year: {
                    $year: { date: '$transactionDate', timezone: 'UTC' },
                  },
                  month: {
                    $month: { date: '$transactionDate', timezone: 'UTC' },
                  },
                  type: '$type',
                  currency: '$currency',
                },
                total: { $sum: '$amount' },
              },
            },
          ],
        },
      },
    ];

    const [result] =
      await this.transactionModel.aggregate<TransactionFacetResult>(pipeline);

    return (
      result ?? {
        recentTransactions: [],
        monthlyStats: [],
        expenseByCategory: [],
        monthlyTrend: [],
      }
    );
  }

  /** Attaches each transaction's own account currency as `$currency` — only
   * valid for INCOME/EXPENSE transactions (always have `accountId` set,
   * unlike transfers), which is all every caller of this helper matches on
   * beforehand. */
  private currencyLookupStages(): PipelineStage.FacetPipelineStage[] {
    return [
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      { $addFields: { currency: '$account.currency' } },
    ];
  }

  private mapRecentTransactions(
    raw: TransactionFacetResult['recentTransactions'],
  ): DashboardTransactionDto[] {
    return raw.map((transaction) => ({
      id: transaction._id.toString(),
      amount: transaction.amount,
      type: transaction.type,
      accountName: transaction.accountName ?? null,
      categoryName: transaction.categoryName ?? null,
      categoryIcon: transaction.categoryIcon ?? null,
      categoryColor: transaction.categoryColor ?? null,
      notes: transaction.notes ?? null,
      paymentMethod: transaction.paymentMethod ?? null,
      transactionDate: transaction.transactionDate,
    }));
  }

  private mapExpenseByCategory(
    raw: TransactionFacetResult['expenseByCategory'],
    monthlyExpense: number,
    targetCurrency: string,
  ): ExpenseByCategoryDto[] {
    // One category can have several currency buckets (a household member
    // spent on it in a different-currency account) — combine them into one
    // converted total per category before mapping to the response shape.
    const byCategory = new Map<
      string,
      {
        categoryName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
        total: number;
        transactionCount: number;
      }
    >();

    for (const item of raw) {
      const categoryId = item._id.categoryId.toString();
      const converted = this.exchangeRateService.convert(
        item.total,
        item._id.currency,
        targetCurrency,
      );
      const existing = byCategory.get(categoryId);
      if (existing) {
        existing.total += converted;
        existing.transactionCount += item.transactionCount;
      } else {
        byCategory.set(categoryId, {
          categoryName: item.categoryName,
          categoryIcon: item.categoryIcon ?? null,
          categoryColor: item.categoryColor ?? null,
          total: converted,
          transactionCount: item.transactionCount,
        });
      }
    }

    return [...byCategory.entries()]
      .map(([categoryId, entry]) => ({
        categoryId,
        ...entry,
        percentage:
          monthlyExpense > 0
            ? Math.round((entry.total / monthlyExpense) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private mapAccountSummary(
    raw: AccountBalanceAggregate[],
  ): AccountSummaryDto[] {
    return raw.map((account) => ({
      id: account._id.toString(),
      name: account.name,
      type: account.type as AccountType,
      currency: account.currency,
      color: account.color ?? null,
      icon: account.icon ?? null,
      balance: account.balance,
    }));
  }

  private buildMonthlyTrend(
    raw: MonthlyTrendAggregate[],
    targetCurrency: string,
  ): MonthlyTrendDto[] {
    const months = getLastNMonths(MONTHLY_TREND_MONTHS, new Date());

    const convertedSum = (year: number, month: number, type: TransactionType) =>
      raw
        .filter(
          (entry) =>
            entry._id.year === year &&
            entry._id.month === month &&
            entry._id.type === type,
        )
        .reduce(
          (sum, entry) =>
            sum +
            this.exchangeRateService.convert(
              entry.total,
              entry._id.currency,
              targetCurrency,
            ),
          0,
        );

    return months.map(({ year, month, label }) => {
      const income = convertedSum(year, month, TransactionType.INCOME);
      const expense = convertedSum(year, month, TransactionType.EXPENSE);

      return { year, month, label, income, expense, savings: income - expense };
    });
  }
}
