import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop({ type: String, default: null, select: false })
  currentRefreshTokenHash!: string | null;

  @Prop({ type: String, default: null, select: false })
  passwordResetTokenHash!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
