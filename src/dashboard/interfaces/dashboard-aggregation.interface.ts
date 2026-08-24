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

/** Grouped by currency (via a `$lookup` on the transaction's account) as
 * well as type — Mongo's `$sum` can't itself convert currencies, so each
 * currency's subtotal is summed separately here and converted/combined in
 * `DashboardService` using `ExchangeRateService`. */
export interface MonthlyStatAggregate {
  _id: { type: TransactionType; currency: string };
  total: number;
}

export interface ExpenseByCategoryAggregate {
  _id: { categoryId: Types.ObjectId; currency: string };
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  transactionCount: number;
}

export interface MonthlyTrendAggregate {
  _id: { year: number; month: number; type: TransactionType; currency: string };
  total: number;
}

export interface TransactionFacetResult {
  recentTransactions: RecentTransactionAggregate[];
  monthlyStats: MonthlyStatAggregate[];
  expenseByCategory: ExpenseByCategoryAggregate[];
  monthlyTrend: MonthlyTrendAggregate[];
}
