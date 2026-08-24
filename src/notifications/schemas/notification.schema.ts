import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

/**
 * In-app record of every notification-worthy event for a user — created
 * alongside (not instead of) the FCM push in `PushNotificationService`, so
 * this list stays complete even when the push itself doesn't reach a
 * device (no token registered, Firebase not configured, app closed and the
 * OS drops it, ...). Backs the notification center; nothing else reads it.
 */
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
export class Notification {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  /** Free-form tag (e.g. "budget_threshold", "household_invite") the
   * frontend switches on to decide where tapping the notification should
   * navigate — mirrors `PushPayload.data.type`. */
  @Prop({ required: true })
  type!: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  data!: Record<string, string>;

  @Prop({ default: false, index: true })
  read!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
