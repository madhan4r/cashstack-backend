import { Types } from 'mongoose';

export interface AccountBalanceAggregate {
  _id: Types.ObjectId;
  name: string;
  type: string;
  currency: string;
  color: string | null;
  icon: string | null;
  balance: number;
}
