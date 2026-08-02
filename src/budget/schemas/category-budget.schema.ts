import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CategoryBudgetDocument = HydratedDocument<CategoryBudget>;

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
export class CategoryBudget {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true })
  categoryId!: Types.ObjectId;

  /** A single, always-current monthly limit for this category — same
   * "not tracked per calendar month" model as the overall Budget. */
  @Prop({ required: true })
  amount!: number;
}

export const CategoryBudgetSchema =
  SchemaFactory.createForClass(CategoryBudget);
CategoryBudgetSchema.index({ userId: 1, categoryId: 1 }, { unique: true });
