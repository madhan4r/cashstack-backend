import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { HouseholdInviteStatus } from '../enums';

export type HouseholdInviteDocument = HydratedDocument<HouseholdInvite>;

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
export class HouseholdInvite {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Household',
    required: true,
    index: true,
  })
  householdId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  invitedEmail!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  invitedBy!: Types.ObjectId;

  @Prop({
    type: String,
    enum: HouseholdInviteStatus,
    default: HouseholdInviteStatus.PENDING,
    index: true,
  })
  status!: HouseholdInviteStatus;

  @Prop({ type: Date, default: null })
  respondedAt!: Date | null;
}

export const HouseholdInviteSchema =
  SchemaFactory.createForClass(HouseholdInvite);
