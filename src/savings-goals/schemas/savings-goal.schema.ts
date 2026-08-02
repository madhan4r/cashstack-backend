import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SavingsGoalDocument = HydratedDocument<SavingsGoal>;

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
export class SavingsGoal {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  targetAmount!: number;

  /** Manually tracked progress toward `targetAmount` — contributions/
   * withdrawals are logged by the user, not derived from real account
   * transactions, so this stays simple (no double-entry accounting tie-in
   * to actual money movement). */
  @Prop({ default: 0 })
  currentAmount!: number;

  @Prop({ type: Date, default: null })
  targetDate!: Date | null;

  @Prop({ type: String, default: null })
  icon!: string | null;

  @Prop({ type: String, default: null })
  color!: string | null;
}

export const SavingsGoalSchema = SchemaFactory.createForClass(SavingsGoal);
