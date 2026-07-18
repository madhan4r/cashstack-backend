import { TransactionType } from '../../transactions/enums';
import { RecurrenceFrequency, RecurringStatus, ReminderOption } from '../enums';

export interface SanitizedRecurring {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  notes: string | null;
  frequency: RecurrenceFrequency;
  customIntervalDays: number | null;
  startDate: Date;
  endDate: Date | null;
  reminder: ReminderOption;
  autoGenerate: boolean;
  status: RecurringStatus;
  nextDueDate: Date;
  lastGeneratedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
