import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { HouseholdViewMode } from '../../household/enums';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: String, default: 'INR' })
  preferredCurrency!: string;

  @Prop({ type: String, default: null, select: false })
  currentRefreshTokenHash!: string | null;

  @Prop({ type: String, default: null, select: false })
  passwordResetTokenHash!: string | null;

  /** A user belongs to at most one household at a time — joining a new one
   * (accepting an invite) requires leaving the current one first. `null`
   * means every accounts/transactions/etc. query scopes to this user alone. */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Household',
    default: null,
    index: true,
  })
  householdId!: Types.ObjectId | null;

  /** This member's own preference for whether they currently see the
   * household's data pooled together or just their own — see
   * `HouseholdViewMode`. Irrelevant while `householdId` is `null`. */
  @Prop({
    type: String,
    enum: HouseholdViewMode,
    default: HouseholdViewMode.COMBINED,
  })
  householdViewMode!: HouseholdViewMode;

  /** Relative path (e.g. `/uploads/avatars/<file>`), not an absolute URL —
   * the backend's own origin can change between environments, so the
   * frontend joins this onto its configured API origin. `null` until the
   * user uploads one. */
  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  /** FCM registration tokens for this user's devices — a device can be
   * removed/reinstalled without ever calling the unregister endpoint, so
   * this is pruned lazily whenever a send comes back with an
   * invalid/unregistered-token error, not eagerly. */
  @Prop({ type: [String], default: [] })
  pushTokens!: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
