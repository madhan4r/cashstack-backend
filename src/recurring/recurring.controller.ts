import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { ParseObjectIdPipe } from '../common/pipes';
import { RECURRING_MESSAGES } from '../common/constants';
import { RecurringService } from './recurring.service';
import {
  CreateRecurringDto,
  OccurrenceHistoryDto,
  QueryHistoryDto,
  QueryRecurringDto,
  QueryUpcomingDto,
  RecurringResponseDto,
  UpcomingOccurrenceDto,
  UpdateRecurringDto,
} from './dto';

@ApiTags('Recurring Transactions')
@ApiBearerAuth()
@Controller({ path: 'recurring-transactions', version: '1' })
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a recurring transaction',
    description:
      'Schedules a new recurring income or expense (e.g. Netflix subscription, monthly salary). If the start date is already due, catches up immediately.',
  })
  @ApiCreatedResponse({ type: RecurringResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRecurringDto,
  ) {
    const doc = await this.recurringService.create(userId, dto);
    return {
      message: RECURRING_MESSAGES.CREATED,
      data: this.recurringService.toSanitized(doc),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List recurring transactions',
    description:
      "Lists the authenticated user's recurring transactions, optionally filtered by status/frequency and sorted by next due date, amount, or recency. Due schedules are caught up (generated or marked missed) before the list is returned.",
  })
  @ApiOkResponse({ type: [RecurringResponseDto] })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryRecurringDto,
  ) {
    const docs = await this.recurringService.findAll(userId, query);
    return {
      message: RECURRING_MESSAGES.LIST_FETCHED,
      data: docs.map((doc) => this.recurringService.toSanitized(doc)),
    };
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Preview upcoming scheduled transactions',
    description:
      'Projects every active schedule forward within the given window (default 30 days) without generating anything.',
  })
  @ApiOkResponse({ type: [UpcomingOccurrenceDto] })
  async getUpcoming(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryUpcomingDto,
  ) {
    const data = await this.recurringService.getUpcoming(
      userId,
      query.days ?? 30,
    );
    return { message: RECURRING_MESSAGES.UPCOMING_FETCHED, data };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Recurring schedule history',
    description:
      'Paginated log of every occurrence that has come due — generated transactions and missed schedules — optionally filtered by status or a single recurring transaction.',
  })
  @ApiOkResponse({ type: OccurrenceHistoryDto })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryHistoryDto,
  ) {
    const data = await this.recurringService.getHistory(userId, query);
    return { message: RECURRING_MESSAGES.HISTORY_FETCHED, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring transaction by ID' })
  @ApiOkResponse({ type: RecurringResponseDto })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const doc = await this.recurringService.findOne(userId, id);
    return {
      message: RECURRING_MESSAGES.FETCHED,
      data: this.recurringService.toSanitized(doc),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring transaction' })
  @ApiOkResponse({ type: RecurringResponseDto })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    const doc = await this.recurringService.update(userId, id, dto);
    return {
      message: RECURRING_MESSAGES.UPDATED,
      data: this.recurringService.toSanitized(doc),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring transaction' })
  @ApiOkResponse({ description: 'Recurring transaction deleted successfully' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.recurringService.remove(userId, id);
    return { message: RECURRING_MESSAGES.DELETED, data: null };
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a recurring transaction' })
  @ApiOkResponse({ type: RecurringResponseDto })
  async pause(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const doc = await this.recurringService.pause(userId, id);
    return {
      message: RECURRING_MESSAGES.PAUSED,
      data: this.recurringService.toSanitized(doc),
    };
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a paused recurring transaction' })
  @ApiOkResponse({ type: RecurringResponseDto })
  async resume(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const doc = await this.recurringService.resume(userId, id);
    return {
      message: RECURRING_MESSAGES.RESUMED,
      data: this.recurringService.toSanitized(doc),
    };
  }
}
