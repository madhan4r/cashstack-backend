import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceNotFoundException } from '../common/exceptions';
import { NOTIFICATION_MESSAGES } from '../common/constants';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PushPayload } from './push-notification.service';

const PAGE_SIZE = 30;

@Injectable()
export class NotificationRecordService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  async record(userId: string, payload: PushPayload): Promise<void> {
    await this.notificationModel.create({
      userId,
      title: payload.title,
      body: payload.body,
      type: payload.data?.type ?? 'general',
      data: payload.data ?? {},
    });
  }

  async listForUser(
    userId: string,
    page: number,
  ): Promise<{
    items: NotificationResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [items, total] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .exec(),
      this.notificationModel.countDocuments({ userId }).exec(),
    ]);

    return {
      items: items.map((n) => this.toSanitized(n)),
      meta: {
        total,
        page,
        limit: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE) || 0,
      },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId, read: false })
      .exec();
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.notificationModel
      .updateOne({ _id: id, userId }, { $set: { read: true } })
      .exec();
    if (result.matchedCount === 0) {
      throw new ResourceNotFoundException(NOTIFICATION_MESSAGES.NOT_FOUND);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId, read: false }, { $set: { read: true } })
      .exec();
  }

  private toSanitized(doc: NotificationDocument): NotificationResponseDto {
    return {
      id: doc._id.toString(),
      title: doc.title,
      body: doc.body,
      type: doc.type,
      data: doc.data,
      read: doc.read,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    };
  }
}
