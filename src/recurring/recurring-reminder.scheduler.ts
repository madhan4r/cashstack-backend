import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PushNotificationService } from '../notifications/push-notification.service';
import { RecurringStatus } from './enums';
import { RecurringTransaction } from './schemas/recurring-transaction.schema';

/**
 * Daily digest push for recurring transactions due today — independent of
 * `RecurringService.catchUp` (which actually generates the transactions and
 * runs lazily on-demand from read endpoints). This only reads `nextDueDate`
 * and notifies; it never mutates a schedule, so it can't race with or
 * duplicate anything `catchUp` does.
 */
@Injectable()
export class RecurringReminderScheduler {
  private readonly logger = new Logger(RecurringReminderScheduler.name);

  constructor(
    @InjectModel(RecurringTransaction.name)
    private readonly recurringModel: Model<RecurringTransaction>,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyDueToday(): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const dueToday = await this.recurringModel
      .find({
        status: RecurringStatus.ACTIVE,
        nextDueDate: { $gte: startOfDay, $lt: endOfDay },
      })
      .exec();

    const byUser = new Map<string, typeof dueToday>();
    for (const doc of dueToday) {
      const userId = doc.userId.toString();
      const existing = byUser.get(userId);
      if (existing) {
        existing.push(doc);
      } else {
        byUser.set(userId, [doc]);
      }
    }

    for (const [userId, docs] of byUser) {
      const body =
        docs.length === 1
          ? `"${docs[0].name}" is due today`
          : `${docs.length} recurring transactions are due today`;
      try {
        await this.pushNotificationService.sendToUser(userId, {
          title: 'Recurring transactions due',
          body,
          data: { type: 'recurring_due_today' },
        });
      } catch (error) {
        // One user's bad/stale token shouldn't stop the rest of the batch.
        this.logger.error(
          `Failed to send due-today push to user ${userId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
