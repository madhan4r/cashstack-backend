import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { HouseholdService } from '../../household/household.service';
import { CategoryStats } from '../interfaces';

/**
 * Computes per-category transaction stats (count, total amount, last-used
 * date) directly from the `transactions` collection via a raw aggregation.
 * Deliberately queries the collection directly (via `@InjectConnection`)
 * rather than importing the Transactions module, so Categories doesn't take
 * on a dependency back onto the module that already depends on it.
 */
@Injectable()
export class CategoryStatsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly householdService: HouseholdService,
  ) {}

  async getStatsByCategory(
    userId: string,
    categoryIds?: string[],
  ): Promise<Map<string, CategoryStats>> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const match: Record<string, unknown> = {
      userId: { $in: scopeIds.map((id) => new Types.ObjectId(id)) },
      categoryId: { $ne: null },
    };

    if (categoryIds?.length) {
      match.categoryId = {
        $in: categoryIds.map((id) => new Types.ObjectId(id)),
      };
    }

    const rows = await this.connection
      .collection('transactions')
      .aggregate<{
        _id: Types.ObjectId;
        transactionCount: number;
        totalAmount: number;
        lastUsedAt: Date;
      }>([
        { $match: match },
        {
          $group: {
            _id: '$categoryId',
            transactionCount: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            lastUsedAt: { $max: '$transactionDate' },
          },
        },
      ])
      .toArray();

    return new Map(
      rows.map((row) => [
        row._id.toString(),
        {
          transactionCount: row.transactionCount,
          totalAmount: row.totalAmount,
          lastUsedAt: row.lastUsedAt,
        },
      ]),
    );
  }

  async getStatsForCategory(
    userId: string,
    categoryId: string,
  ): Promise<CategoryStats> {
    const stats = await this.getStatsByCategory(userId, [categoryId]);
    return (
      stats.get(categoryId) ?? {
        transactionCount: 0,
        totalAmount: 0,
        lastUsedAt: null,
      }
    );
  }
}
