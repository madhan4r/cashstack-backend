import { Types } from 'mongoose';
import { PaymentMethod, TransactionType } from '../../transactions/enums';

export interface RecentTransactionAggregate {
  _id: Types.ObjectId;
  amount: number;
  type: TransactionType;
  accountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  transactionDate: Date;
}

export interface MonthlyStatAggregate {
  _id: TransactionType;
  total: number;
}

export interface ExpenseByCategoryAggregate {
  _id: Types.ObjectId;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  transactionCount: number;
}

export interface MonthlyTrendAggregate {
  _id: { year: number; month: number; type: TransactionType };
  total: number;
}

export interface TransactionFacetResult {
  recentTransactions: RecentTransactionAggregate[];
  monthlyStats: MonthlyStatAggregate[];
  expenseByCategory: ExpenseByCategoryAggregate[];
  monthlyTrend: MonthlyTrendAggregate[];
}
