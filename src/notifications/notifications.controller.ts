import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { NOTIFICATION_MESSAGES } from '../common/constants';
import { NotificationResponseDto } from './dto';
import { NotificationRecordService } from './notification-record.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly notificationRecordService: NotificationRecordService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's notifications, newest first",
  })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
  ) {
    const data = await this.notificationRecordService.listForUser(
      userId,
      page ? parseInt(page, 10) : 1,
    );
    return { message: NOTIFICATION_MESSAGES.FETCHED, data };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count of unread notifications' })
  async unreadCount(@CurrentUser('sub') userId: string) {
    const count = await this.notificationRecordService.unreadCount(userId);
    return { message: NOTIFICATION_MESSAGES.FETCHED, data: { count } };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.notificationRecordService.markRead(userId, id);
    return { message: NOTIFICATION_MESSAGES.MARKED_READ };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every notification as read' })
  async markAllRead(@CurrentUser('sub') userId: string) {
    await this.notificationRecordService.markAllRead(userId);
    return { message: NOTIFICATION_MESSAGES.ALL_MARKED_READ };
  }
}
