import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) {}

  async create(
    userId: string,
    dto: CreateFeedbackDto,
  ): Promise<FeedbackDocument> {
    return this.feedbackModel.create({
      userId,
      message: dto.message,
      screenshot: dto.screenshot ?? null,
      appVersion: dto.appVersion ?? null,
      platform: dto.platform ?? null,
    });
  }
}
