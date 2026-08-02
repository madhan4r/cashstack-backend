import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountBalanceService } from '../accounts/services/account-balance.service';
import { AccountBalanceAggregate } from '../accounts/interfaces';
import { AccountType } from '../accounts/enums';
import { BudgetService } from '../budget/budget.service';
import { Transaction } from '../transactions/schemas/transaction.schema';
import { TransactionType } from '../transactions/enums';
import { getLastNMonths, getUtcMonthRange } from '../common/utils';
import { HouseholdService } from '../household/household.service';
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
  ) {}

  async getDashboard(userId: string): Promise<DashboardDataDto> {
    // Resolved once and handed to every branch below — each of them would
    // otherwise independently re-resolve it via HouseholdService, tripling
    // the number of Mongo round-trips this endpoint makes for no reason.
    const scopeUserIds =
      await this.householdService.getAccessibleUserIds(userId);

    const [transactionFacets, accountBalances, monthlyBudget] =
      await Promise.all([
        this.getTransactionFacets(scopeUserIds),
        this.accountBalanceService.getAccountBalances(userId, {
          scopeUserIds,
        }),
        this.budgetService.getAggregateAmount(userId, scopeUserIds),
      ]);

    const currentBalance = accountBalances.reduce(
      (sum, account) => sum + account.balance,
      0,
    );

    const monthlyIncome =
      transactionFacets.monthlyStats.find(
        (stat) => stat._id === TransactionType.INCOME,
      )?.total ?? 0;
    const monthlyExpense =
      transactionFacets.monthlyStats.find(
        (stat) => stat._id === TransactionType.EXPENSE,
      )?.total ?? 0;

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
      ),
      accountSummary: this.mapAccountSummary(accountBalances),
      monthlyTrend: this.buildMonthlyTrend(transactionFacets.monthlyTrend),
    };
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
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ],
          expenseByCategory: [
            {
              $match: {
                transactionDate: { $gte: monthStart, $lt: monthEnd },
                type: TransactionType.EXPENSE,
                categoryId: { $ne: null },
              },
            },
            {
              $group: {
                _id: '$categoryId',
                total: { $sum: '$amount' },
                transactionCount: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: '_id',
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
  ): ExpenseByCategoryDto[] {
    return raw.map((item) => ({
      categoryId: item._id.toString(),
      categoryName: item.categoryName,
      categoryIcon: item.categoryIcon ?? null,
      categoryColor: item.categoryColor ?? null,
      total: item.total,
      transactionCount: item.transactionCount,
      percentage:
        monthlyExpense > 0
          ? Math.round((item.total / monthlyExpense) * 1000) / 10
          : 0,
    }));
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

  private buildMonthlyTrend(raw: MonthlyTrendAggregate[]): MonthlyTrendDto[] {
    const months = getLastNMonths(MONTHLY_TREND_MONTHS, new Date());

    return months.map(({ year, month, label }) => {
      const income =
        raw.find(
          (entry) =>
            entry._id.year === year &&
            entry._id.month === month &&
            entry._id.type === TransactionType.INCOME,
        )?.total ?? 0;
      const expense =
        raw.find(
          (entry) =>
            entry._id.year === year &&
            entry._id.month === month &&
            entry._id.type === TransactionType.EXPENSE,
        )?.total ?? 0;

      return { year, month, label, income, expense, savings: income - expense };
    });
  }
}
