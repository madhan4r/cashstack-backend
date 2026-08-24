import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '../../accounts/enums';
import { PaymentMethod, TransactionType } from '../../transactions/enums';

export class DashboardTransactionDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 1500 })
  amount!: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  type!: TransactionType;

  @ApiPropertyOptional({ example: 'HDFC Savings', nullable: true })
  accountName!: string | null;

  @ApiPropertyOptional({ example: 'Groceries', nullable: true })
  categoryName!: string | null;

  @ApiPropertyOptional({ example: 'shopping-cart', nullable: true })
  categoryIcon!: string | null;

  @ApiPropertyOptional({ example: '#F59E0B', nullable: true })
  categoryColor!: string | null;

  @ApiPropertyOptional({ example: 'Weekly groceries', nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  transactionDate!: Date;
}

export class ExpenseByCategoryDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  categoryId!: string;

  @ApiProperty({ example: 'Groceries' })
  categoryName!: string;

  @ApiPropertyOptional({ example: 'shopping-cart', nullable: true })
  categoryIcon!: string | null;

  @ApiPropertyOptional({ example: '#F59E0B', nullable: true })
  categoryColor!: string | null;

  @ApiProperty({ example: 4200 })
  total!: number;

  @ApiProperty({ example: 12 })
  transactionCount!: number;

  @ApiProperty({
    description: "Percentage of this month's total expense",
    example: 23.5,
  })
  percentage!: number;
}

export class SpendingInsightDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  categoryId!: string;

  @ApiProperty({ example: 'Dining Out' })
  categoryName!: string;

  @ApiProperty({
    example: "You've spent 45% more on Dining Out than your usual month",
  })
  message!: string;

  @ApiProperty({
    example: 45,
    description:
      'How much higher this month is than the trailing average, as a percentage',
  })
  percentageAboveAverage!: number;
}

export class AccountSummaryDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'HDFC Savings' })
  name!: string;

  @ApiProperty({ enum: AccountType, example: AccountType.BANK })
  type!: AccountType;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiPropertyOptional({ example: '#4F46E5', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ example: 'bank', nullable: true })
  icon!: string | null;

  @ApiProperty({
    example: 12500,
    description: 'Opening balance plus net effect of all transactions',
  })
  balance!: number;
}

export class MonthlyTrendDto {
  @ApiProperty({ example: 2024 })
  year!: number;

  @ApiProperty({ example: 1, description: 'Month number, 1-12' })
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

export class DashboardDataDto {
  @ApiProperty({
    example: 45230,
    description: 'Sum of all active account balances',
  })
  currentBalance!: number;

  @ApiProperty({
    example: 55000,
    description: 'Total income for the current month',
  })
  monthlyIncome!: number;

  @ApiProperty({
    example: 32000,
    description: 'Total expense for the current month',
  })
  monthlyExpense!: number;

  @ApiProperty({
    example: 23000,
    description: 'monthlyIncome minus monthlyExpense',
  })
  monthlySavings!: number;

  @ApiPropertyOptional({
    example: 30000,
    nullable: true,
    description: "The user's set monthly budget, or null if none is set",
  })
  monthlyBudget!: number | null;

  @ApiProperty({
    example: 3000,
    description: 'monthlyBudget minus monthlyExpense; 0 when no budget is set',
  })
  budgetRemaining!: number;

  @ApiProperty({ type: [DashboardTransactionDto] })
  recentTransactions!: DashboardTransactionDto[];

  @ApiProperty({ type: [ExpenseByCategoryDto] })
  expenseByCategory!: ExpenseByCategoryDto[];

  @ApiProperty({ type: [SpendingInsightDto] })
  spendingInsights!: SpendingInsightDto[];

  @ApiProperty({ type: [AccountSummaryDto] })
  accountSummary!: AccountSummaryDto[];

  @ApiProperty({ type: [MonthlyTrendDto] })
  monthlyTrend!: MonthlyTrendDto[];
}
