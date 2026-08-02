import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type BudgetDocument = HydratedDocument<Budget>;

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
export class Budget {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;

  /** A single, always-current monthly spending limit — not tracked per
   * calendar month. Changing it takes effect immediately against the
   * current month's spend; past months aren't retroactively recomputed
   * against a different budget. */
  @Prop({ required: true })
  amount!: number;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
