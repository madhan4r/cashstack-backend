import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { REPORT_MESSAGES } from '../common/constants';
import { ReportsService } from './reports.service';
import { SummaryReportQueryDto } from './dto/summary-report-query.dto';
import { MonthlyReportQueryDto } from './dto/monthly-report-query.dto';
import { YearlyReportQueryDto } from './dto/yearly-report-query.dto';
import { CategoryReportQueryDto } from './dto/category-report-query.dto';
import { AccountReportQueryDto } from './dto/account-report-query.dto';
import { CashFlowReportQueryDto } from './dto/cash-flow-report-query.dto';
import {
  AccountReportDto,
  CashFlowReportDto,
  CategoryReportDto,
  MonthlyReportDto,
  SummaryReportDto,
  YearlyReportDto,
} from './dto/report-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get summary report',
    description:
      'Returns current balance, total income, total expense, net savings, savings rate, and transaction count for the authenticated user, optionally scoped by date range, account, category, transaction type, or tags. Computed dynamically via MongoDB aggregation; nothing is stored.',
  })
  @ApiOkResponse({
    description: 'Summary report fetched successfully',
    type: SummaryReportDto,
  })
  async getSummary(
    @CurrentUser('sub') userId: string,
    @Query() query: SummaryReportQueryDto,
  ) {
    const data = await this.reportsService.getSummary(userId, query);
    return { message: REPORT_MESSAGES.SUMMARY_FETCHED, data };
  }

  @Get('monthly')
  @ApiOperation({
    summary: 'Get monthly report',
    description:
      'Returns income, expense, savings, a day-by-day breakdown, expense/income by category, and the top spending categories/income sources for a given month (defaults to the current month). Optionally scoped by account, category, transaction type, or tags.',
  })
  @ApiOkResponse({
    description: 'Monthly report fetched successfully',
    type: MonthlyReportDto,
  })
  async getMonthly(
    @CurrentUser('sub') userId: string,
    @Query() query: MonthlyReportQueryDto,
  ) {
    const data = await this.reportsService.getMonthly(userId, query);
    return { message: REPORT_MESSAGES.MONTHLY_FETCHED, data };
  }

  @Get('yearly')
  @ApiOperation({
    summary: 'Get yearly report',
    description:
      'Returns month-by-month income, expense, and savings for a given year (defaults to the current year), along with the highest spending/income months and average monthly income/expense. Optionally scoped by account, category, transaction type, or tags.',
  })
  @ApiOkResponse({
    description: 'Yearly report fetched successfully',
    type: YearlyReportDto,
  })
  async getYearly(
    @CurrentUser('sub') userId: string,
    @Query() query: YearlyReportQueryDto,
  ) {
    const data = await this.reportsService.getYearly(userId, query);
    return { message: REPORT_MESSAGES.YEARLY_FETCHED, data };
  }

  @Get('category')
  @ApiOperation({
    summary: 'Get category report',
    description:
      'Returns a paginated breakdown of amount, percentage of total, and transaction count per category, sorted by highest spending. Defaults to EXPENSE transactions; pass transactionType=INCOME to break down income instead. Supports the standard date/account/category/tag filters.',
  })
  @ApiOkResponse({
    description: 'Category report fetched successfully',
    type: CategoryReportDto,
  })
  async getCategoryReport(
    @CurrentUser('sub') userId: string,
    @Query() query: CategoryReportQueryDto,
  ) {
    const data = await this.reportsService.getCategoryReport(userId, query);
    return { message: REPORT_MESSAGES.CATEGORY_FETCHED, data };
  }

  @Get('account')
  @ApiOperation({
    summary: 'Get account report',
    description:
      'Returns a paginated breakdown of income, expense, current balance, and transaction count per account. Income/expense/transaction count respect the date/category/transaction type/tag filters; current balance is always the live, unfiltered balance.',
  })
  @ApiOkResponse({
    description: 'Account report fetched successfully',
    type: AccountReportDto,
  })
  async getAccountReport(
    @CurrentUser('sub') userId: string,
    @Query() query: AccountReportQueryDto,
  ) {
    const data = await this.reportsService.getAccountReport(userId, query);
    return { message: REPORT_MESSAGES.ACCOUNT_FETCHED, data };
  }

  @Get('cash-flow')
  @ApiOperation({
    summary: 'Get cash flow report',
    description:
      "Returns opening balance, money in, money out, and closing balance for a date range (defaults to month-to-date). When accountId is provided, transfers into/out of that account count as cash flow; otherwise only INCOME/EXPENSE transactions are counted, since transfers between the user's own accounts do not change total net worth.",
  })
  @ApiOkResponse({
    description: 'Cash flow report fetched successfully',
    type: CashFlowReportDto,
  })
  async getCashFlow(
    @CurrentUser('sub') userId: string,
    @Query() query: CashFlowReportQueryDto,
  ) {
    const data = await this.reportsService.getCashFlow(userId, query);
    return { message: REPORT_MESSAGES.CASH_FLOW_FETCHED, data };
  }
}
