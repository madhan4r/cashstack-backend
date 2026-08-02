import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HouseholdService } from '../household/household.service';
import { Budget } from './schemas/budget.schema';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private readonly budgetModel: Model<Budget>,
    private readonly householdService: HouseholdService,
  ) {}

  /** Returns the caller's own monthly budget amount, or `null` if they've
   * never set one — deliberately NOT household-widened, since each member
   * sets their own personal cap (see [getAggregateAmount] for the household
   * total, used by the Dashboard). */
  async getAmount(userId: string): Promise<number | null> {
    const budget = await this.budgetModel.findOne({ userId }).exec();
    return budget?.amount ?? null;
  }

  /** Sum of every household member's own budget (or just the caller's if
   * solo) — `null` only when nobody in scope has set one. Used by the
   * Dashboard so a household's "monthly budget" reflects everyone's caps
   * combined. */
  async getAggregateAmount(userId: string): Promise<number | null> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const budgets = await this.budgetModel
      .find({ userId: { $in: scopeIds } })
      .exec();
    if (budgets.length === 0) return null;
    return budgets.reduce((sum, budget) => sum + budget.amount, 0);
  }

  async set(userId: string, amount: number): Promise<number> {
    await this.budgetModel
      .updateOne({ userId }, { $set: { amount } }, { upsert: true })
      .exec();
    return amount;
  }

  async clear(userId: string): Promise<void> {
    await this.budgetModel.deleteOne({ userId }).exec();
  }
}
