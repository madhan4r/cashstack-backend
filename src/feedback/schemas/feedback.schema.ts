import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type FeedbackDocument = HydratedDocument<Feedback>;

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
export class Feedback {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  message!: string;

  /** Base64-encoded PNG of the screen the user was on when they reported
   * this — small enough (a single device screen) to store inline rather
   * than standing up a separate object-storage integration. */
  @Prop({ type: String, default: null })
  screenshot!: string | null;

  @Prop({ type: String, default: null })
  appVersion!: string | null;

  @Prop({ type: String, default: null })
  platform!: string | null;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
