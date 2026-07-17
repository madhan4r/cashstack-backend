import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { PaymentMethod, TransactionType } from '../enums';

export type TransactionDocument = HydratedDocument<Transaction>;

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
export class Transaction {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ required: true, enum: TransactionType, index: true })
  type!: TransactionType;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    default: null,
    index: true,
  })
  accountId!: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    default: null,
    index: true,
  })
  categoryId!: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    default: null,
    index: true,
  })
  fromAccountId!: Types.ObjectId | null;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    default: null,
    index: true,
  })
  toAccountId!: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  notes!: string | null;

  @Prop({ type: String, enum: PaymentMethod, default: null })
  paymentMethod!: PaymentMethod | null;

  @Prop({ required: true, index: true })
  transactionDate!: Date;

  @Prop({ type: [String], default: [] })
  tags!: string[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1, transactionDate: -1 });
TransactionSchema.index({ notes: 'text', tags: 'text' });
