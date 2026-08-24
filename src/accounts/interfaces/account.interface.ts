import { AccountType } from '../enums';

export interface SanitizedAccount {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  isArchived: boolean;
  lowBalanceThreshold: number | null;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
}
