import { Types } from 'mongoose';
import { TransactionType } from '../../transactions/enums';

export interface TypeTotalAggregate {
  _id: TransactionType;
  total: number;
  count: number;
}

export interface DayTotalAggregate {
  _id: { day: number; type: TransactionType };
  total: number;
}

export interface CategoryTotalAggregate {
  _id: Types.ObjectId;
  categoryName: string;
  amount: number;
  transactionCount: number;
}

export interface MonthTotalAggregate {
  _id: { month: number; type: TransactionType };
  total: number;
}

export interface AccountLedgerTotalAggregate {
  _id: { accountId: Types.ObjectId; type: TransactionType };
  total: number;
}

export interface AccountTransactionCountAggregate {
  _id: Types.ObjectId;
  count: number;
}

export interface DirectionTotalAggregate {
  _id: 'IN' | 'OUT';
  total: number;
}
