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
import { TRANSACTION_MESSAGES } from '../common/constants';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  QueryTransactionsDto,
  TransactionResponseDto,
  PaginatedTransactionsResponseDto,
} from './dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a transaction',
    description:
      'Creates an INCOME, EXPENSE, or TRANSFER transaction for the authenticated user. INCOME/EXPENSE require accountId and categoryId; TRANSFER requires fromAccountId and toAccountId. All referenced accounts and categories must belong to the authenticated user (or be a default category).',
  })
  @ApiCreatedResponse({
    description: 'Transaction created successfully',
    type: TransactionResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    const transaction = await this.transactionsService.create(userId, dto);
    return {
      message: TRANSACTION_MESSAGES.CREATED,
      data: this.transactionsService.toSanitized(transaction),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List transactions',
    description:
      "Lists the authenticated user's transactions with support for filtering by date, month, year, category, account, and type, free-text search, pagination, and sorting (newest, oldest, amount).",
  })
  @ApiOkResponse({
    description: 'Transactions fetched successfully',
    type: PaginatedTransactionsResponseDto,
  })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryTransactionsDto,
  ) {
    const result = await this.transactionsService.findAll(userId, query);
    return {
      message: TRANSACTION_MESSAGES.LIST_FETCHED,
      data: {
        items: result.items.map((transaction) =>
          this.transactionsService.toSanitized(transaction),
        ),
        meta: result.meta,
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a transaction by ID',
    description:
      'Fetches a single transaction belonging to the authenticated user. Returns 404 if the transaction does not exist or belongs to another user.',
  })
  @ApiOkResponse({
    description: 'Transaction fetched successfully',
    type: TransactionResponseDto,
  })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const transaction = await this.transactionsService.findOne(userId, id);
    return {
      message: TRANSACTION_MESSAGES.FETCHED,
      data: this.transactionsService.toSanitized(transaction),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a transaction',
    description:
      'Updates an existing transaction. Re-validates account/category ownership and transfer rules based on the resulting transaction type.',
  })
  @ApiOkResponse({
    description: 'Transaction updated successfully',
    type: TransactionResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const transaction = await this.transactionsService.update(userId, id, dto);
    return {
      message: TRANSACTION_MESSAGES.UPDATED,
      data: this.transactionsService.toSanitized(transaction),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a transaction',
    description:
      'Permanently deletes a transaction belonging to the authenticated user.',
  })
  @ApiOkResponse({ description: 'Transaction deleted successfully' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.transactionsService.remove(userId, id);
    return {
      message: TRANSACTION_MESSAGES.DELETED,
      data: null,
    };
  }
}
