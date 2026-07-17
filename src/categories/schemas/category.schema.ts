import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { CategoryType } from '../enums';

export type CategoryDocument = HydratedDocument<Category>;

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
export class Category {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: CategoryType })
  type!: CategoryType;

  @Prop({ type: String, default: null })
  icon!: string | null;

  @Prop({ type: String, default: null })
  color!: string | null;

  @Prop({ default: false, index: true })
  isDefault!: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ userId: 1, type: 1, name: 1 });
