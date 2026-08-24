import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PushNotificationService } from '../../notifications/push-notification.service';
import { Account, AccountDocument } from '../schemas/account.schema';
import { AccountBalanceService } from './account-balance.service';

/**
 * Arms/disarms the low-balance push per account — see
 * `Account.lowBalanceAlertActive`'s doc for why this is an arm/disarm flag
 * rather than a dedup ledger like budget alerts. Every public method
 * swallows its own errors: this runs inline after a transaction affecting
 * the account is created, and a failed check must never fail that
 * transaction.
 */
@Injectable()
export class AccountAlertService {
  private readonly logger = new Logger(AccountAlertService.name);

  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly accountBalanceService: AccountBalanceService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async check(accountId: string): Promise<void> {
    try {
      const account = await this.accountModel.findById(accountId).exec();
      if (!account || account.lowBalanceThreshold == null) return;

      const balances = await this.accountBalanceService.getAccountBalances(
        account.userId.toString(),
        { accountId, includeArchived: true },
      );
      const balance = balances[0]?.balance;
      if (balance === undefined) return;

      const isLow = balance < account.lowBalanceThreshold;

      if (isLow && !account.lowBalanceAlertActive) {
        await this.setActive(account, true);
        await this.pushNotificationService.sendToUser(
          account.userId.toString(),
          {
            title: 'Low balance',
            body: `"${account.name}" is below your ${account.lowBalanceThreshold} threshold (currently ${balance.toFixed(2)})`,
            data: { type: 'low_balance', accountId: account._id.toString() },
          },
        );
      } else if (!isLow && account.lowBalanceAlertActive) {
        await this.setActive(account, false);
      }
    } catch (error) {
      this.logger.error(
        `Low-balance check failed for account ${accountId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async setActive(
    account: AccountDocument,
    active: boolean,
  ): Promise<void> {
    account.lowBalanceAlertActive = active;
    await account.save();
  }
}
