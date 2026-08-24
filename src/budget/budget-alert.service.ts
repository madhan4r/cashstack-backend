import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { getUtcMonthRange } from '../common/utils';
import { PushNotificationService } from '../notifications/push-notification.service';
import { TransactionType } from '../transactions/enums';
import { Budget } from './schemas/budget.schema';
import { BudgetAlert } from './schemas/budget-alert.schema';
import { CategoryBudget } from './schemas/category-budget.schema';

/** Checked highest-first — a single call only ever sends the highest
 * newly-crossed threshold, since spend only grows across the calls this is
 * triggered from (transaction creation), so a lower threshold was already
 * handled (or itself just crossed) on an earlier call this month. */
const THRESHOLDS = [100, 90];

const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Fires a push once per (user, category-or-overall, month, threshold) the
 * first time that month's spend crosses it — 90% and 100% of whichever cap
 * is in play. Every public method swallows its own errors (logged, not
 * thrown): this runs inline after a transaction is created, and a budget
 * alert failing must never fail the transaction itself.
 */
@Injectable()
export class BudgetAlertService {
  private readonly logger = new Logger(BudgetAlertService.name);

  constructor(
    @InjectModel(Budget.name) private readonly budgetModel: Model<Budget>,
    @InjectModel(CategoryBudget.name)
    private readonly categoryBudgetModel: Model<CategoryBudget>,
    @InjectModel(BudgetAlert.name)
    private readonly budgetAlertModel: Model<BudgetAlert>,
    @InjectConnection() private readonly connection: Connection,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /** Checks the caller's own overall budget. */
  async checkOverall(userId: string): Promise<void> {
    try {
      const budget = await this.budgetModel.findOne({ userId }).exec();
      if (!budget) return;

      const { start, end } = getUtcMonthRange(new Date());
      const spent = await this.sumExpenses(userId, null, start, end);
      await this.notifyIfCrossed(
        userId,
        null,
        'your overall',
        spent,
        budget.amount,
        start,
      );
    } catch (error) {
      this.logger.error(
        `Overall budget-alert check failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /** Checks the caller's own budget for one category. */
  async checkCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const budget = await this.categoryBudgetModel
        .findOne({ userId, categoryId })
        .exec();
      if (!budget) return;

      const { start, end } = getUtcMonthRange(new Date());
      const spent = await this.sumExpenses(userId, categoryId, start, end);

      const category = await this.connection
        .collection('categories')
        .findOne({ _id: new Types.ObjectId(categoryId) });
      const categoryName = (category?.name as string | undefined) ?? 'your';

      await this.notifyIfCrossed(
        userId,
        categoryId,
        `your "${categoryName}"`,
        spent,
        budget.amount,
        start,
      );
    } catch (error) {
      this.logger.error(
        `Category budget-alert check failed for user ${userId}, category ${categoryId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sumExpenses(
    userId: string,
    categoryId: string | null,
    start: Date,
    end: Date,
  ): Promise<number> {
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      type: TransactionType.EXPENSE,
      transactionDate: { $gte: start, $lt: end },
    };
    if (categoryId) match.categoryId = new Types.ObjectId(categoryId);

    const [row] = await this.connection
      .collection('transactions')
      .aggregate<{ total: number }>([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray();
    return row?.total ?? 0;
  }

  private async notifyIfCrossed(
    userId: string,
    categoryId: string | null,
    label: string,
    spent: number,
    budgetAmount: number,
    monthStart: Date,
  ): Promise<void> {
    if (budgetAmount <= 0) return;
    const percent = (spent / budgetAmount) * 100;
    const month = monthStart.toISOString().slice(0, 7);

    for (const threshold of THRESHOLDS) {
      if (percent < threshold) continue;

      try {
        await this.budgetAlertModel.create({
          userId,
          categoryId,
          month,
          threshold,
        });
      } catch (error) {
        if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE) {
          // Already alerted for this threshold this month.
          return;
        }
        throw error;
      }

      const body =
        threshold >= 100
          ? `You've gone over ${label} budget this month`
          : `You've used ${threshold}% of ${label} budget this month`;
      await this.pushNotificationService.sendToUser(userId, {
        title: 'Budget alert',
        body,
        data: {
          type: 'budget_threshold',
          categoryId: categoryId ?? '',
          threshold: String(threshold),
        },
      });
      return;
    }
  }
}
