import { ApiProperty } from '@nestjs/swagger';

export class SummaryReportDto {
  @ApiProperty({ example: 45230 })
  currentBalance!: number;

  @ApiProperty({ example: 55000 })
  totalIncome!: number;

  @ApiProperty({ example: 32000 })
  totalExpense!: number;

  @ApiProperty({ example: 23000 })
  netSavings!: number;

  @ApiProperty({ example: 41.8, description: 'netSavings / totalIncome * 100' })
  savingsRate!: number;

  @ApiProperty({ example: 48 })
  transactionCount!: number;
}

export class CategoryBreakdownItemDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  categoryId!: string;

  @ApiProperty({ example: 'Groceries' })
  categoryName!: string;

  @ApiProperty({ example: 4200 })
  amount!: number;

  @ApiProperty({ example: 23.5 })
  percentage!: number;

  @ApiProperty({ example: 12 })
  transactionCount!: number;
}

export class DailyBreakdownItemDto {
  @ApiProperty({ example: 15, description: 'Day of the month, 1-31' })
  day!: number;

  @ApiProperty({ example: '2024-01-15' })
  date!: string;

  @ApiProperty({ example: 2000 })
  income!: number;

  @ApiProperty({ example: 1500 })
  expense!: number;

  @ApiProperty({ example: 500 })
  savings!: number;
}

export class MonthlyReportDto {
  @ApiProperty({ example: 2024 })
  year!: number;

  @ApiProperty({ example: 1 })
  month!: number;

  @ApiProperty({ example: 55000 })
  income!: number;

  @ApiProperty({ example: 32000 })
  expense!: number;

  @ApiProperty({ example: 23000 })
  savings!: number;

  @ApiProperty({ type: [DailyBreakdownItemDto] })
  dailyBreakdown!: DailyBreakdownItemDto[];

  @ApiProperty({ type: [CategoryBreakdownItemDto] })
  expenseByCategory!: CategoryBreakdownItemDto[];

  @ApiProperty({ type: [CategoryBreakdownItemDto] })
  incomeByCategory!: CategoryBreakdownItemDto[];

  @ApiProperty({
    type: [CategoryBreakdownItemDto],
    description: 'Top 5 entries of expenseByCategory',
  })
  topSpendingCategories!: CategoryBreakdownItemDto[];

  @ApiProperty({
    type: [CategoryBreakdownItemDto],
    description: 'Top 5 entries of incomeByCategory',
  })
  topIncomeSources!: CategoryBreakdownItemDto[];
}

export class MonthlyBreakdownItemDto {
  @ApiProperty({ example: 1 })
  month!: number;

  @ApiProperty({ example: '2024-01' })
  label!: string;

  @ApiProperty({ example: 55000 })
  income!: number;

  @ApiProperty({ example: 32000 })
  expense!: number;

  @ApiProperty({ example: 23000 })
  savings!: number;
}

export class YearlyReportDto {
  @ApiProperty({ example: 2024 })
  year!: number;

  @ApiProperty({ type: [MonthlyBreakdownItemDto] })
  monthlyBreakdown!: MonthlyBreakdownItemDto[];

  @ApiProperty({ type: MonthlyBreakdownItemDto, nullable: true })
  highestSpendingMonth!: MonthlyBreakdownItemDto | null;

  @ApiProperty({ type: MonthlyBreakdownItemDto, nullable: true })
  highestIncomeMonth!: MonthlyBreakdownItemDto | null;

  @ApiProperty({ example: 2666.67 })
  averageMonthlyExpense!: number;

  @ApiProperty({ example: 4583.33 })
  averageMonthlyIncome!: number;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class CategoryReportItemDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  categoryId!: string;

  @ApiProperty({ example: 'Groceries' })
  categoryName!: string;

  @ApiProperty({ example: 4200 })
  amount!: number;

  @ApiProperty({ example: 23.5 })
  percentage!: number;

  @ApiProperty({ example: 12 })
  transactionCount!: number;
}

export class CategoryReportDto {
  @ApiProperty({ type: [CategoryReportItemDto] })
  items!: CategoryReportItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class AccountReportItemDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  accountId!: string;

  @ApiProperty({ example: 'HDFC Savings' })
  accountName!: string;

  @ApiProperty({ example: 55000 })
  income!: number;

  @ApiProperty({ example: 32000 })
  expense!: number;

  @ApiProperty({ example: 45230 })
  currentBalance!: number;

  @ApiProperty({ example: 48 })
  transactionCount!: number;
}

export class AccountReportDto {
  @ApiProperty({ type: [AccountReportItemDto] })
  items!: AccountReportItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class CashFlowReportDto {
  @ApiProperty({ example: '2024-01-01' })
  fromDate!: string;

  @ApiProperty({ example: '2024-01-31' })
  toDate!: string;

  @ApiProperty({ example: 22230 })
  openingBalance!: number;

  @ApiProperty({ example: 55000 })
  moneyIn!: number;

  @ApiProperty({ example: 32000 })
  moneyOut!: number;

  @ApiProperty({ example: 45230 })
  closingBalance!: number;
}
