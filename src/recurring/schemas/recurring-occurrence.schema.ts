import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { OccurrenceStatus } from '../enums';

export type RecurringOccurrenceDocument = HydratedDocument<RecurringOccurrence>;

/**
 * One historical record per due date that has already passed for a
 * recurring transaction — created on demand by `RecurringService.catchUp`
 * (this project has no background job runner, so schedules are caught up
 * whenever the user reads their recurring list/history, not via a cron).
 */
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
export class RecurringOccurrence {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'RecurringTransaction',
    required: true,
    index: true,
  })
  recurringTransactionId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: true, enum: OccurrenceStatus })
  status!: OccurrenceStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Transaction', default: null })
  transactionId!: Types.ObjectId | null;
}

export const RecurringOccurrenceSchema =
  SchemaFactory.createForClass(RecurringOccurrence);

RecurringOccurrenceSchema.index({ userId: 1, dueDate: -1 });
