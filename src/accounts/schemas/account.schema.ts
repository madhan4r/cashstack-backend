import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AccountType } from '../enums';

export type AccountDocument = HydratedDocument<Account>;

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
export class Account {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: AccountType })
  type!: AccountType;

  @Prop({ required: true, default: 0 })
  openingBalance!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency!: string;

  @Prop({ type: String, default: null })
  color!: string | null;

  @Prop({ type: String, default: null })
  icon!: string | null;

  @Prop({ type: String, default: null, trim: true })
  description!: string | null;

  @Prop({ default: false })
  isArchived!: boolean;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  /** `null` disables low-balance alerts for this account. */
  @Prop({ type: Number, default: null })
  lowBalanceThreshold!: number | null;

  /** Arm/disarm flag rather than a per-period dedup ledger (contrast with
   * budget alerts, which reset monthly): balance can drop below and climb
   * back above the threshold arbitrarily often, and each new dip below
   * should re-alert. Set true on send, reset to false once the balance
   * recovers above the threshold — see AccountAlertService. */
  @Prop({ default: false })
  lowBalanceAlertActive!: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.index(
  { userId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
