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

  /** Set explicitly at creation time (createdAt + INVITE_EXPIRY_DAYS) —
   * a stale invite (email typo, invitee never signs up) would otherwise
   * hang around as PENDING forever, silently reserving the invitedEmail
   * against future re-invites and cluttering the invitee's pending list
   * if they ever do create an account with that address. */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const HouseholdInviteSchema =
  SchemaFactory.createForClass(HouseholdInvite);
