import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type BudgetAlertDocument = HydratedDocument<BudgetAlert>;

/**
 * One row per (user, category-or-overall, month, threshold) that's already
 * been pushed — purely a dedup ledger for `BudgetAlertService`, nothing
 * reads it back for display. The unique index is what actually prevents a
 * duplicate send when two transactions land close together; the app-level
 * "already exists?" check is just to skip the write in the common case.
 */
@Schema({ timestamps: true })
export class BudgetAlert {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  /** `null` means the overall monthly budget, not a specific category. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', default: null })
  categoryId!: Types.ObjectId | null;

  /** UTC year-month, e.g. "2026-08" — see `getUtcMonthRange`. */
  @Prop({ required: true })
  month!: string;

  @Prop({ required: true })
  threshold!: number;
}

export const BudgetAlertSchema = SchemaFactory.createForClass(BudgetAlert);
BudgetAlertSchema.index(
  { userId: 1, categoryId: 1, month: 1, threshold: 1 },
  { unique: true },
);
