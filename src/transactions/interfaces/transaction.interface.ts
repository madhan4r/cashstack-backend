import { PaymentMethod, TransactionType } from '../enums';

export interface SanitizedTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  accountId: string | null;
  categoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  transactionDate: Date;
  tags: string[];
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
