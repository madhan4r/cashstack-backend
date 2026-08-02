import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { getUtcMonthRange } from '../common/utils';
import { TransactionType } from '../transactions/enums';
import { HouseholdService } from '../household/household.service';
import { CategoryBudgetResponseDto } from './dto/category-budget-response.dto';
import { CategoryBudget } from './schemas/category-budget.schema';

@Injectable()
export class CategoryBudgetService {
  constructor(
    @InjectModel(CategoryBudget.name)
    private readonly categoryBudgetModel: Model<CategoryBudget>,
    // Queries `categories`/`transactions` directly rather than importing
    // those modules, same reasoning as CategoryStatsService: avoids Budget
    // taking on a dependency back onto modules that may depend on it.
    @InjectConnection() private readonly connection: Connection,
    private readonly householdService: HouseholdService,
  ) {}

  /** Each member's own category budgets, summed per category — same
   * household-aggregate reasoning as BudgetService.getAggregateAmount. */
  async getAll(userId: string): Promise<CategoryBudgetResponseDto[]> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const scopeObjectIds = scopeIds.map((id) => new Types.ObjectId(id));
    const budgets = await this.categoryBudgetModel
      .find({ userId: { $in: scopeIds } })
      .exec();
    if (budgets.length === 0) return [];

    const amountByCategory = new Map<string, number>();
    for (const budget of budgets) {
      const categoryId = budget.categoryId.toString();
      amountByCategory.set(
        categoryId,
        (amountByCategory.get(categoryId) ?? 0) + budget.amount,
      );
    }
    const categoryIds = [...amountByCategory.keys()].map(
      (id) => new Types.ObjectId(id),
    );

    const categories = await this.connection
      .collection('categories')
      .find({ _id: { $in: categoryIds } })
      .toArray();
    const categoryById = new Map(categories.map((c) => [c._id.toString(), c]));

    const { start, end } = getUtcMonthRange(new Date());
    const spendRows = await this.connection
      .collection('transactions')
      .aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            userId: { $in: scopeObjectIds },
            categoryId: { $in: categoryIds },
            type: TransactionType.EXPENSE,
            transactionDate: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
      ])
      .toArray();
    const spentById = new Map(
      spendRows.map((row) => [row._id.toString(), row.total]),
    );

    return [...amountByCategory.entries()].map(([categoryId, amount]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        categoryName:
          (category?.name as string | undefined) ?? 'Unknown category',
        categoryIcon: (category?.icon as string | undefined) ?? null,
        categoryColor: (category?.color as string | undefined) ?? null,
        amount,
        spent: spentById.get(categoryId) ?? 0,
      };
    });
  }

  async set(userId: string, categoryId: string, amount: number): Promise<void> {
    await this.categoryBudgetModel
      .updateOne({ userId, categoryId }, { $set: { amount } }, { upsert: true })
      .exec();
  }

  async clear(userId: string, categoryId: string): Promise<void> {
    await this.categoryBudgetModel.deleteOne({ userId, categoryId }).exec();
  }
}
