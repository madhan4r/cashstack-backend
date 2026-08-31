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
  SpendingInsightDto,
} from './dto/dashboard-response.dto';
import {
  CategoryHistoricalStatAggregate,
  MonthlyTrendAggregate,
  TransactionFacetResult,
} from './interfaces';

const RECENT_TRANSACTIONS_LIMIT = 10;
const MONTHLY_TREND_MONTHS = 6;
/** How many months of prior spend a category's "usual" average is drawn
 * from — see `buildSpendingInsights`. */
const INSIGHT_HISTORY_MONTHS = 3;
/** A category only surfaces as an insight once it's this much above its
 * trailing average — below this is normal month-to-month noise. */
const INSIGHT_THRESHOLD_PERCENT = 30;
/** Ignores a spike in a category too small to matter (e.g. a ₹50 category
 * doubling to ₹100 isn't a meaningful insight) — in the target currency's
 * units, so this is deliberately a round number rather than unit-aware. */
const INSIGHT_MIN_AVERAGE = 200;
const MAX_INSIGHTS = 3;

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
    // Independent of each other, so run in parallel rather than serially.
    const [scopeUserIds, user] = await Promise.all([
      this.householdService.getAccessibleUserIds(userId),
      this.usersService.findById(userId),
    ]);
    const targetCurrency = user.preferredCurrency;

    const [transactionFacets, accountBalances, monthlyBudget, ownerNames] =
      await Promise.all([
        this.getTransactionFacets(scopeUserIds),
        this.accountBalanceService.getAccountBalances(userId, {
          scopeUserIds,
        }),
        this.budgetService.getAggregateAmount(userId, scopeUserIds),
        this.householdService.getAccessibleUserNames(userId),
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
        ownerNames,
      ),
      expenseByCategory: this.mapExpenseByCategory(
        transactionFacets.expenseByCategory,
        monthlyExpense,
        targetCurrency,
      ),
      spendingInsights: this.buildSpendingInsights(
        transactionFacets.expenseByCategory,
        transactionFacets.categoryHistoricalStats,
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
    // The INSIGHT_HISTORY_MONTHS calendar months immediately before the
    // current (partial) one — deliberately excludes the current month
    // itself, since comparing a still-in-progress month's category totals
    // to its own average would be comparing partial data to itself.
    const insightHistoryStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - INSIGHT_HISTORY_MONTHS,
        1,
      ),
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
                userId: 1,
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
          // Same shape as expenseByCategory but over the trailing months
          // before the current one — used only to compute each category's
          // "usual" average for spending insights, not displayed directly.
          categoryHistoricalStats: [
            {
              $match: {
                transactionDate: { $gte: insightHistoryStart, $lt: monthStart },
                type: TransactionType.EXPENSE,
                categoryId: { $ne: null },
              },
            },
            ...this.currencyLookupStages(),
            {
              $group: {
                _id: { categoryId: '$categoryId', currency: '$currency' },
                total: { $sum: '$amount' },
              },
            },
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
        categoryHistoricalStats: [],
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
    ownerNames: Map<string, string>,
  ): DashboardTransactionDto[] {
    return raw.map((transaction) => ({
      id: transaction._id.toString(),
      amount: transaction.amount,
      type: transaction.type,
      ownerId: transaction.userId.toString(),
      ownerName: ownerNames.get(transaction.userId.toString()) ?? null,
      accountName: transaction.accountName ?? null,
      categoryName: transaction.categoryName ?? null,
      categoryIcon: transaction.categoryIcon ?? null,
      categoryColor: transaction.categoryColor ?? null,
      notes: transaction.notes ?? null,
      paymentMethod: transaction.paymentMethod ?? null,
      transactionDate: transaction.transactionDate,
    }));
  }

  /** One category can have several currency buckets (a household member
   * spent on it in a different-currency account) — combines them into one
   * converted total per category. Shared by `mapExpenseByCategory` (this
   * month's totals) and `buildSpendingInsights` (the trailing average),
   * so both agree on exactly how a category's total is computed. */
  private combineByCategory(
    raw: {
      _id: { categoryId: Types.ObjectId; currency: string };
      total: number;
      transactionCount?: number;
      categoryName?: string;
      categoryIcon?: string | null;
      categoryColor?: string | null;
    }[],
    targetCurrency: string,
  ): Map<
    string,
    {
      categoryName: string | null;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
      transactionCount: number;
    }
  > {
    const byCategory = new Map<
      string,
      {
        categoryName: string | null;
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
        existing.transactionCount += item.transactionCount ?? 0;
      } else {
        byCategory.set(categoryId, {
          categoryName: item.categoryName ?? null,
          categoryIcon: item.categoryIcon ?? null,
          categoryColor: item.categoryColor ?? null,
          total: converted,
          transactionCount: item.transactionCount ?? 0,
        });
      }
    }

    return byCategory;
  }

  private mapExpenseByCategory(
    raw: TransactionFacetResult['expenseByCategory'],
    monthlyExpense: number,
    targetCurrency: string,
  ): ExpenseByCategoryDto[] {
    const byCategory = this.combineByCategory(raw, targetCurrency);

    return [...byCategory.entries()]
      .map(([categoryId, entry]) => ({
        categoryId,
        categoryName: entry.categoryName ?? 'Unknown category',
        categoryIcon: entry.categoryIcon,
        categoryColor: entry.categoryColor,
        total: entry.total,
        transactionCount: entry.transactionCount,
        percentage:
          monthlyExpense > 0
            ? Math.round((entry.total / monthlyExpense) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  /** Flags categories spending significantly (see INSIGHT_THRESHOLD_PERCENT)
   * above their trailing INSIGHT_HISTORY_MONTHS average — the highest
   * percentage-over-average categories first, capped at MAX_INSIGHTS so the
   * dashboard isn't flooded on a first month of heavy use. */
  private buildSpendingInsights(
    currentMonthRaw: TransactionFacetResult['expenseByCategory'],
    historicalRaw: CategoryHistoricalStatAggregate[],
    targetCurrency: string,
  ): SpendingInsightDto[] {
    const current = this.combineByCategory(currentMonthRaw, targetCurrency);
    const historicalTotals = this.combineByCategory(
      historicalRaw,
      targetCurrency,
    );

    const insights: SpendingInsightDto[] = [];
    for (const [categoryId, entry] of current) {
      const average =
        (historicalTotals.get(categoryId)?.total ?? 0) / INSIGHT_HISTORY_MONTHS;
      if (average < INSIGHT_MIN_AVERAGE) continue;

      const percentageAboveAverage = Math.round(
        ((entry.total - average) / average) * 100,
      );
      if (percentageAboveAverage < INSIGHT_THRESHOLD_PERCENT) continue;

      insights.push({
        categoryId,
        categoryName: entry.categoryName ?? 'Unknown category',
        message: `You've spent ${percentageAboveAverage}% more on ${entry.categoryName} than your usual month`,
        percentageAboveAverage,
      });
    }

    return insights
      .sort((a, b) => b.percentageAboveAverage - a.percentageAboveAverage)
      .slice(0, MAX_INSIGHTS);
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
