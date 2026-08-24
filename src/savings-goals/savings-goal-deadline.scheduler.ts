import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PushNotificationService } from '../notifications/push-notification.service';
import { SavingsGoal } from './schemas/savings-goal.schema';

const REMINDER_DAYS_BEFORE = 3;

/** Daily nudge for goals with an upcoming `targetDate` that aren't funded
 * yet — same "read-only digest, no state mutation" shape as
 * RecurringReminderScheduler. Fires exactly once per goal since it matches
 * on the single UTC calendar day exactly REMINDER_DAYS_BEFORE out, not a
 * "due within N days" range. */
@Injectable()
export class SavingsGoalDeadlineScheduler {
  private readonly logger = new Logger(SavingsGoalDeadlineScheduler.name);

  constructor(
    @InjectModel(SavingsGoal.name)
    private readonly savingsGoalModel: Model<SavingsGoal>,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyUpcomingDeadlines(): Promise<void> {
    const targetDayStart = new Date();
    targetDayStart.setUTCHours(0, 0, 0, 0);
    targetDayStart.setUTCDate(
      targetDayStart.getUTCDate() + REMINDER_DAYS_BEFORE,
    );
    const targetDayEnd = new Date(targetDayStart);
    targetDayEnd.setUTCDate(targetDayEnd.getUTCDate() + 1);

    const goals = await this.savingsGoalModel
      .find({
        targetDate: { $gte: targetDayStart, $lt: targetDayEnd },
        $expr: { $lt: ['$currentAmount', '$targetAmount'] },
      })
      .exec();

    for (const goal of goals) {
      const remaining = goal.targetAmount - goal.currentAmount;
      try {
        await this.pushNotificationService.sendToUser(goal.userId.toString(), {
          title: 'Savings goal deadline approaching',
          body: `"${goal.name}" is due in ${REMINDER_DAYS_BEFORE} days — ${remaining.toFixed(2)} left to reach it`,
          data: {
            type: 'savings_goal_deadline',
            savingsGoalId: goal._id.toString(),
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send deadline reminder for goal ${goal._id.toString()}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
