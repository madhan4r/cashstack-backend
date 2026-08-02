import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget } from './schemas/budget.schema';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private readonly budgetModel: Model<Budget>,
  ) {}

  /** Returns the user's current monthly budget amount, or `null` if
   * they've never set one. Used directly by DashboardService too. */
  async getAmount(userId: string): Promise<number | null> {
    const budget = await this.budgetModel.findOne({ userId }).exec();
    return budget?.amount ?? null;
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
