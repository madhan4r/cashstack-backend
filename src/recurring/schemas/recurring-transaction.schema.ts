import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { TransactionType } from '../../transactions/enums';
import { RecurrenceFrequency, RecurringStatus, ReminderOption } from '../enums';

export type RecurringTransactionDocument =
  HydratedDocument<RecurringTransaction>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class RecurringTransaction {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  /** INCOME or EXPENSE only — TRANSFER is rejected in the service; a
   * recurring transfer isn't a supported concept here. */
  @Prop({ required: true, enum: TransactionType })
  type!: TransactionType;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true })
  categoryId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Account', required: true })
  accountId!: Types.ObjectId;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  notes!: string | null;

  @Prop({ required: true, enum: RecurrenceFrequency })
  frequency!: RecurrenceFrequency;

  /** Only meaningful when `frequency === CUSTOM` — the interval in days. */
  @Prop({ type: Number, default: null, min: 1 })
  customIntervalDays!: number | null;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ required: true, enum: ReminderOption, default: ReminderOption.NONE })
  reminder!: ReminderOption;

  /** When true, a due occurrence is generated as a real `Transaction`
   * automatically; when false, it's only tracked as a reminder/MISSED
   * occurrence and the user must add the transaction themselves. */
  @Prop({ default: true })
  autoGenerate!: boolean;

  @Prop({
    required: true,
    enum: RecurringStatus,
    default: RecurringStatus.ACTIVE,
    index: true,
  })
  status!: RecurringStatus;

  /** The next date this schedule is due — advances every time an
   * occurrence (generated or missed) is processed. Initialized to
   * `startDate` at creation. */
  @Prop({ required: true, index: true })
  nextDueDate!: Date;

  @Prop({ type: Date, default: null })
  lastGeneratedDate!: Date | null;
}

export const RecurringTransactionSchema =
  SchemaFactory.createForClass(RecurringTransaction);

RecurringTransactionSchema.index({ userId: 1, status: 1 });
RecurringTransactionSchema.index({ userId: 1, nextDueDate: 1 });
