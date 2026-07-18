import { CategoryType } from '../enums';

export interface SanitizedCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  description: string | null;
  isDefault: boolean;
  isArchived: boolean;
  transactionCount: number;
  totalAmount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryStats {
  transactionCount: number;
  totalAmount: number;
  lastUsedAt: Date | null;
}
