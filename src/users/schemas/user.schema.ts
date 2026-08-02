import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

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
}

export const UserSchema = SchemaFactory.createForClass(User);
