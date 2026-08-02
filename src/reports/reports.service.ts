import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountBalanceService } from '../accounts/services/account-balance.service';
import { Account } from '../accounts/schemas/account.schema';
import { Transaction } from '../transactions/schemas/transaction.schema';
import { TransactionType } from '../transactions/enums';
import { HouseholdService } from '../household/household.service';
import {
  getMonthsOfYear,
  getUtcDayRange,
  getUtcMonthRange,
  getUtcYearRange,
} from '../common/utils';
import { ReportFilterDto } from './dto/report-filter.dto';
import { SummaryReportQueryDto } from './dto/summary-report-query.dto';
import { MonthlyReportQueryDto } from './dto/monthly-report-query.dto';
import { YearlyReportQueryDto } from './dto/yearly-report-query.dto';
import { CategoryReportQueryDto } from './dto/category-report-query.dto';
import { AccountReportQueryDto } from './dto/account-report-query.dto';
import { CashFlowReportQueryDto } from './dto/cash-flow-report-query.dto';
import {
  AccountReportDto,
  AccountReportItemDto,
  CashFlowReportDto,
  CategoryBreakdownItemDto,
  CategoryReportDto,
  DailyBreakdownItemDto,
  MonthlyBreakdownItemDto,
  MonthlyReportDto,
  SummaryReportDto,
  YearlyReportDto,
} from './dto/report-response.dto';
import {
  AccountLedgerTotalAggregate,
  AccountTransactionCountAggregate,
  CategoryTotalAggregate,
  DayTotalAggregate,
  DirectionTotalAggregate,
  MonthTotalAggregate,
  TypeTotalAggregate,
} from './interfaces';

const TOP_CATEGORY_LIMIT = 5;

interface DateWindow {
  start: Date;
  end: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly accountBalanceService: AccountBalanceService,
    private readonly householdService: HouseholdService,
  ) {}

  async getSummary(
    userId: string,
    filters: SummaryReportQueryDto,
  ): Promise<SummaryReportDto> {
    const match = await this.buildTransactionMatch(userId, filters);

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ];

    const [stats, currentBalance] = await Promise.all([
      this.transactionModel.aggregate<TypeTotalAggregate>(pipeline),
      this.accountBalanceService.getCurrentBalance(userId, {
        accountId: filters.accountId,
      }),
    ]);

    const totalIncome =
      stats.find((stat) => stat._id === TransactionType.INCOME)?.total ?? 0;
    const totalExpense =
      stats.find((stat) => stat._id === TransactionType.EXPENSE)?.total ?? 0;
    const transactionCount = stats.reduce((sum, stat) => sum + stat.count, 0);
    const netSavings = totalIncome - totalExpense;

    return {
      currentBalance,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate: this.percentage(netSavings, totalIncome),
      transactionCount,
    };
  }

  async getMonthly(
    userId: string,
    query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportDto> {
    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month ?? now.getUTCMonth() + 1;
    const window: DateWindow = {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };

    const match = await this.buildTransactionMatch(userId, query, window);
    const incomeExpenseMatch = {
      type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          totals: [
            { $match: incomeExpenseMatch },
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ],
          dailyBreakdown: [
            { $match: incomeExpenseMatch },
            {
              $group: {
                _id: {
                  day: {
                    $dayOfMonth: { date: '$transactionDate', timezone: 'UTC' },
                  },
                  type: '$type',
                },
                total: { $sum: '$amount' },
              },
            },
          ],
          expenseByCategory: this.categoryBreakdownStages(
            TransactionType.EXPENSE,
          ),
          incomeByCategory: this.categoryBreakdownStages(
            TransactionType.INCOME,
          ),
        },
      },
    ];

    const [result] = await this.transactionModel.aggregate<{
      totals: TypeTotalAggregate[];
      dailyBreakdown: DayTotalAggregate[];
      expenseByCategory: CategoryTotalAggregate[];
      incomeByCategory: CategoryTotalAggregate[];
    }>(pipeline);

    const totals = result?.totals ?? [];
    const income =
      totals.find((stat) => stat._id === TransactionType.INCOME)?.total ?? 0;
    const expense =
      totals.find((stat) => stat._id === TransactionType.EXPENSE)?.total ?? 0;

    const expenseByCategory = this.mapCategoryBreakdown(
      result?.expenseByCategory ?? [],
      expense,
    );
    const incomeByCategory = this.mapCategoryBreakdown(
      result?.incomeByCategory ?? [],
      income,
    );

    return {
      year,
      month,
      income,
      expense,
      savings: income - expense,
      dailyBreakdown: this.buildDailyBreakdown(
        year,
        month,
        result?.dailyBreakdown ?? [],
      ),
      expenseByCategory,
      incomeByCategory,
      topSpendingCategories: expenseByCategory.slice(0, TOP_CATEGORY_LIMIT),
      topIncomeSources: incomeByCategory.slice(0, TOP_CATEGORY_LIMIT),
    };
  }

  async getYearly(
    userId: string,
    query: YearlyReportQueryDto,
  ): Promise<YearlyReportDto> {
    const year = query.year ?? new Date().getUTCFullYear();
    const window = getUtcYearRange(new Date(Date.UTC(year, 0, 1)));
    const match = await this.buildTransactionMatch(userId, query, window);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...match,
          type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: { date: '$transactionDate', timezone: 'UTC' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ];

    const raw =
      await this.transactionModel.aggregate<MonthTotalAggregate>(pipeline);

    const monthlyBreakdown: MonthlyBreakdownItemDto[] = getMonthsOfYear(
      year,
    ).map(({ month, label }) => {
      const income =
        raw.find(
          (entry) =>
            entry._id.month === month &&
            entry._id.type === TransactionType.INCOME,
        )?.total ?? 0;
      const expense =
        raw.find(
          (entry) =>
            entry._id.month === month &&
            entry._id.type === TransactionType.EXPENSE,
        )?.total ?? 0;

      return { month, label, income, expense, savings: income - expense };
    });

    const totalIncome = monthlyBreakdown.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlyBreakdown.reduce(
      (sum, m) => sum + m.expense,
      0,
    );

    return {
      year,
      monthlyBreakdown,
      highestSpendingMonth: this.maxBy(monthlyBreakdown, (m) => m.expense),
      highestIncomeMonth: this.maxBy(monthlyBreakdown, (m) => m.income),
      averageMonthlyExpense: Math.round((totalExpense / 12) * 100) / 100,
      averageMonthlyIncome: Math.round((totalIncome / 12) * 100) / 100,
    };
  }

  async getCategoryReport(
    userId: string,
    query: CategoryReportQueryDto,
  ): Promise<CategoryReportDto> {
    const effectiveFilters: ReportFilterDto = {
      ...query,
      transactionType: query.transactionType ?? TransactionType.EXPENSE,
    };
    const match = await this.buildTransactionMatch(userId, effectiveFilters);
    if (match.categoryId === undefined) {
      match.categoryId = { $ne: null };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          data: [
            {
              $group: {
                _id: '$categoryId',
                amount: { $sum: '$amount' },
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
                categoryName: '$category.name',
                amount: 1,
                transactionCount: 1,
              },
            },
            { $sort: { amount: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $group: { _id: '$categoryId' } }, { $count: 'count' }],
          grandTotal: [{ $group: { _id: null, total: { $sum: '$amount' } } }],
        },
      },
    ];

    const [result] = await this.transactionModel.aggregate<{
      data: CategoryTotalAggregate[];
      totalCount: { count: number }[];
      grandTotal: { total: number }[];
    }>(pipeline);

    const grandTotal = result?.grandTotal[0]?.total ?? 0;
    const total = result?.totalCount[0]?.count ?? 0;

    return {
      items: this.mapCategoryBreakdown(result?.data ?? [], grandTotal),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getAccountReport(
    userId: string,
    query: AccountReportQueryDto,
  ): Promise<AccountReportDto> {
    const scopeObjectIds = (
      await this.householdService.getAccessibleUserIds(userId)
    ).map((id) => new Types.ObjectId(id));
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const accountMatch: Record<string, unknown> = {
      userId: { $in: scopeObjectIds },
      isDeleted: false,
    };
    if (query.accountId) {
      accountMatch._id = new Types.ObjectId(query.accountId);
    }

    const [accounts, total, balances] = await Promise.all([
      this.accountModel
        .find(accountMatch)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.accountModel.countDocuments(accountMatch).exec(),
      this.accountBalanceService.getAccountBalances(userId, {
        accountId: query.accountId,
        includeArchived: true,
      }),
    ]);

    if (accounts.length === 0) {
      return {
        items: [],
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
      };
    }

    const accountIds = accounts.map((account) => account._id);
    const match = await this.buildTransactionMatch(userId, {
      fromDate: query.fromDate,
      toDate: query.toDate,
      categoryId: query.categoryId,
      transactionType: query.transactionType,
      tags: query.tags,
    });
    match.$or = [
      { accountId: { $in: accountIds } },
      { fromAccountId: { $in: accountIds } },
      { toAccountId: { $in: accountIds } },
    ];

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          incomeExpense: [
            { $match: { accountId: { $ne: null } } },
            {
              $group: {
                _id: { accountId: '$accountId', type: '$type' },
                total: { $sum: '$amount' },
              },
            },
          ],
          transactionCounts: [
            {
              $project: {
                touchedAccounts: {
                  $setUnion: [
                    {
                      $cond: [
                        { $eq: ['$accountId', null] },
                        [],
                        ['$accountId'],
                      ],
                    },
                    {
                      $cond: [
                        { $eq: ['$fromAccountId', null] },
                        [],
                        ['$fromAccountId'],
                      ],
                    },
                    {
                      $cond: [
                        { $eq: ['$toAccountId', null] },
                        [],
                        ['$toAccountId'],
                      ],
                    },
                  ],
                },
              },
            },
            { $unwind: '$touchedAccounts' },
            { $match: { touchedAccounts: { $in: accountIds } } },
            { $group: { _id: '$touchedAccounts', count: { $sum: 1 } } },
          ],
        },
      },
    ];

    const [result] = await this.transactionModel.aggregate<{
      incomeExpense: AccountLedgerTotalAggregate[];
      transactionCounts: AccountTransactionCountAggregate[];
    }>(pipeline);

    const incomeExpense = result?.incomeExpense ?? [];
    const transactionCounts = result?.transactionCounts ?? [];
    const balanceByAccountId = new Map(
      balances.map((balance) => [balance._id.toString(), balance.balance]),
    );

    const items: AccountReportItemDto[] = accounts.map((account) => {
      const idString = account._id.toString();
      const income =
        incomeExpense.find(
          (entry) =>
            entry._id.accountId.toString() === idString &&
            entry._id.type === TransactionType.INCOME,
        )?.total ?? 0;
      const expense =
        incomeExpense.find(
          (entry) =>
            entry._id.accountId.toString() === idString &&
            entry._id.type === TransactionType.EXPENSE,
        )?.total ?? 0;
      const transactionCount =
        transactionCounts.find((entry) => entry._id.toString() === idString)
          ?.count ?? 0;

      return {
        accountId: idString,
        accountName: account.name,
        income,
        expense,
        currentBalance: balanceByAccountId.get(idString) ?? 0,
        transactionCount,
      };
    });

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  async getCashFlow(
    userId: string,
    query: CashFlowReportQueryDto,
  ): Promise<CashFlowReportDto> {
    const now = new Date();
    const defaultWindow = getUtcMonthRange(now);
    const start = query.fromDate
      ? getUtcDayRange(new Date(query.fromDate)).start
      : defaultWindow.start;
    const end = query.toDate
      ? getUtcDayRange(new Date(query.toDate)).end
      : getUtcDayRange(now).end;

    const [openingBalance, closingBalance, flow] = await Promise.all([
      this.accountBalanceService.getCurrentBalance(userId, {
        accountId: query.accountId,
        asOf: start,
      }),
      this.accountBalanceService.getCurrentBalance(userId, {
        accountId: query.accountId,
        asOf: end,
      }),
      this.getMoneyInOut(userId, query, { start, end }),
    ]);

    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: new Date(end.getTime() - 1).toISOString().slice(0, 10),
      openingBalance,
      moneyIn: flow.moneyIn,
      moneyOut: flow.moneyOut,
      closingBalance,
    };
  }

  private async getMoneyInOut(
    userId: string,
    filters: ReportFilterDto,
    window: DateWindow,
  ): Promise<{ moneyIn: number; moneyOut: number }> {
    const match = await this.buildTransactionMatch(userId, filters, window);

    let pipeline: PipelineStage[];

    if (filters.accountId) {
      const accountObjectId = new Types.ObjectId(filters.accountId);
      pipeline = [
        { $match: match },
        {
          $project: {
            direction: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$type', TransactionType.INCOME] },
                    then: 'IN',
                  },
                  {
                    case: { $eq: ['$type', TransactionType.EXPENSE] },
                    then: 'OUT',
                  },
                  {
                    case: { $eq: ['$toAccountId', accountObjectId] },
                    then: 'IN',
                  },
                  {
                    case: { $eq: ['$fromAccountId', accountObjectId] },
                    then: 'OUT',
                  },
                ],
                default: null,
              },
            },
            amount: 1,
          },
        },
        { $match: { direction: { $ne: null } } },
        { $group: { _id: '$direction', total: { $sum: '$amount' } } },
      ];
    } else {
      pipeline = [
        {
          $match: {
            ...match,
            type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
          },
        },
        {
          $project: {
            direction: {
              $cond: [{ $eq: ['$type', TransactionType.INCOME] }, 'IN', 'OUT'],
            },
            amount: 1,
          },
        },
        { $group: { _id: '$direction', total: { $sum: '$amount' } } },
      ];
    }

    const results =
      await this.transactionModel.aggregate<DirectionTotalAggregate>(pipeline);

    return {
      moneyIn: results.find((entry) => entry._id === 'IN')?.total ?? 0,
      moneyOut: results.find((entry) => entry._id === 'OUT')?.total ?? 0,
    };
  }

  /** Reusable $group + $lookup stages for a single-type category breakdown, used inside a $facet. */
  private categoryBreakdownStages(
    type: TransactionType,
  ): PipelineStage.FacetPipelineStage[] {
    return [
      { $match: { type, categoryId: { $ne: null } } },
      {
        $group: {
          _id: '$categoryId',
          amount: { $sum: '$amount' },
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
          categoryName: '$category.name',
          amount: 1,
          transactionCount: 1,
        },
      },
      { $sort: { amount: -1 } },
    ];
  }

  private mapCategoryBreakdown(
    raw: CategoryTotalAggregate[],
    total: number,
  ): CategoryBreakdownItemDto[] {
    return raw.map((item) => ({
      categoryId: item._id.toString(),
      categoryName: item.categoryName,
      amount: item.amount,
      percentage: this.percentage(item.amount, total),
      transactionCount: item.transactionCount,
    }));
  }

  private buildDailyBreakdown(
    year: number,
    month: number,
    raw: DayTotalAggregate[],
  ): DailyBreakdownItemDto[] {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const income =
        raw.find(
          (entry) =>
            entry._id.day === day && entry._id.type === TransactionType.INCOME,
        )?.total ?? 0;
      const expense =
        raw.find(
          (entry) =>
            entry._id.day === day && entry._id.type === TransactionType.EXPENSE,
        )?.total ?? 0;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      return { day, date, income, expense, savings: income - expense };
    });
  }

  private maxBy<T>(items: T[], selector: (item: T) => number): T | null {
    if (items.length === 0) {
      return null;
    }

    return items.reduce((best, current) =>
      selector(current) > selector(best) ? current : best,
    );
  }

  private percentage(part: number, whole: number): number {
    if (whole <= 0) {
      return 0;
    }
    return Math.round((part / whole) * 1000) / 10;
  }

  /**
   * Builds the shared $match filter (userId + fromDate/toDate/accountId/categoryId/
   * transactionType/tags) reused by every report. `dateWindow` overrides
   * fromDate/toDate when a report is scoped to a fixed period (e.g. a specific month).
   */
  private async buildTransactionMatch(
    userId: string,
    filters: ReportFilterDto,
    dateWindow?: DateWindow,
  ): Promise<Record<string, unknown>> {
    const scopeObjectIds = (
      await this.householdService.getAccessibleUserIds(userId)
    ).map((id) => new Types.ObjectId(id));
    const match: Record<string, unknown> = {
      userId: { $in: scopeObjectIds },
    };

    if (dateWindow) {
      match.transactionDate = { $gte: dateWindow.start, $lt: dateWindow.end };
    } else if (filters.fromDate || filters.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.fromDate) {
        dateFilter.$gte = getUtcDayRange(new Date(filters.fromDate)).start;
      }
      if (filters.toDate) {
        dateFilter.$lt = getUtcDayRange(new Date(filters.toDate)).end;
      }
      match.transactionDate = dateFilter;
    }

    if (filters.accountId) {
      const accountObjectId = new Types.ObjectId(filters.accountId);
      match.$or = [
        { accountId: accountObjectId },
        { fromAccountId: accountObjectId },
        { toAccountId: accountObjectId },
      ];
    }

    if (filters.categoryId) {
      match.categoryId = new Types.ObjectId(filters.categoryId);
    }

    if (filters.transactionType) {
      match.type = filters.transactionType;
    }

    if (filters.tags && filters.tags.length > 0) {
      match.tags = { $in: filters.tags };
    }

    return match;
  }
}
