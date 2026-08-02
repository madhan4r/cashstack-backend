import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { FEEDBACK_MESSAGES } from '../common/constants';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller({ path: 'feedback', version: '1' })
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit feedback',
    description:
      'Submits a feedback message, optionally with a base64-encoded screenshot of the screen the user was on.',
  })
  @ApiCreatedResponse({ description: 'Feedback submitted successfully' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    await this.feedbackService.create(userId, dto);
    return {
      message: FEEDBACK_MESSAGES.SUBMITTED,
      data: null,
    };
  }
}
