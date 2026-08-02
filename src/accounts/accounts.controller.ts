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
import { ACCOUNT_MESSAGES } from '../common/constants';
import { HouseholdService } from '../household/household.service';
import { AccountsService } from './accounts.service';
import { AccountBalanceService } from './services/account-balance.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountResponseDto,
  AccountStatsResponseDto,
} from './dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller({ path: 'accounts', version: '1' })
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly accountBalanceService: AccountBalanceService,
    private readonly householdService: HouseholdService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates a new financial account (bank, cash, UPI, e-wallet, or credit card) for the authenticated user. Account names must be unique per user.',
  })
  @ApiCreatedResponse({
    description: 'Account created successfully',
    type: AccountResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAccountDto,
  ) {
    const account = await this.accountsService.create(userId, dto);
    const names = await this.householdService.getAccessibleUserNames(userId);
    return {
      message: ACCOUNT_MESSAGES.CREATED,
      data: this.accountsService.toSanitized(account, names.get(userId) ?? ''),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List accounts',
    description:
      "Lists all of the authenticated user's accounts, excluding soft-deleted ones.",
  })
  @ApiOkResponse({
    description: 'Accounts fetched successfully',
    type: [AccountResponseDto],
  })
  async findAll(@CurrentUser('sub') userId: string) {
    const [accounts, balances, names] = await Promise.all([
      this.accountsService.findAll(userId),
      this.accountBalanceService.getAccountBalances(userId, {
        includeArchived: true,
      }),
      this.householdService.getAccessibleUserNames(userId),
    ]);
    const balanceById = new Map(
      balances.map((balance) => [balance._id.toString(), balance.balance]),
    );

    return {
      message: ACCOUNT_MESSAGES.LIST_FETCHED,
      data: accounts.map((account) => ({
        ...this.accountsService.toSanitized(
          account,
          names.get(account.userId.toString()) ?? '',
        ),
        balance:
          balanceById.get(account._id.toString()) ?? account.openingBalance,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an account by ID',
    description:
      'Fetches a single account belonging to the authenticated user. Returns 404 if the account does not exist or belongs to another user.',
  })
  @ApiOkResponse({
    description: 'Account fetched successfully',
    type: AccountResponseDto,
  })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const [account, balances, names] = await Promise.all([
      this.accountsService.findOne(userId, id),
      this.accountBalanceService.getAccountBalances(userId, {
        accountId: id,
        includeArchived: true,
      }),
      this.householdService.getAccessibleUserNames(userId),
    ]);

    return {
      message: ACCOUNT_MESSAGES.FETCHED,
      data: {
        ...this.accountsService.toSanitized(
          account,
          names.get(account.userId.toString()) ?? '',
        ),
        balance: balances[0]?.balance ?? account.openingBalance,
      },
    };
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get account statistics',
    description:
      'Total income, total expense, and transaction count for a single account, computed from its full transaction ledger.',
  })
  @ApiOkResponse({
    description: 'Account statistics fetched successfully',
    type: AccountStatsResponseDto,
  })
  async stats(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.accountsService.findOne(userId, id);
    const stats = await this.accountBalanceService.getAccountStats(userId, id);

    return {
      message: ACCOUNT_MESSAGES.STATS_FETCHED,
      data: stats ?? {
        balance: 0,
        totalIncome: 0,
        totalExpense: 0,
        transactionCount: 0,
      },
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an account',
    description:
      'Updates one or more fields of an existing account. Account names must remain unique per user.',
  })
  @ApiOkResponse({
    description: 'Account updated successfully',
    type: AccountResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const account = await this.accountsService.update(userId, id, dto);
    const names = await this.householdService.getAccessibleUserNames(userId);
    return {
      message: ACCOUNT_MESSAGES.UPDATED,
      data: this.accountsService.toSanitized(
        account,
        names.get(account.userId.toString()) ?? '',
      ),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an account',
    description:
      'Soft-deletes an account. The account is hidden from listings but not permanently removed.',
  })
  @ApiOkResponse({ description: 'Account deleted successfully' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.accountsService.remove(userId, id);
    return {
      message: ACCOUNT_MESSAGES.DELETED,
      data: null,
    };
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive an account',
    description: 'Marks an account as archived without deleting it.',
  })
  @ApiOkResponse({
    description: 'Account archived successfully',
    type: AccountResponseDto,
  })
  async archive(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const account = await this.accountsService.archive(userId, id);
    const names = await this.householdService.getAccessibleUserNames(userId);
    return {
      message: ACCOUNT_MESSAGES.ARCHIVED,
      data: this.accountsService.toSanitized(
        account,
        names.get(account.userId.toString()) ?? '',
      ),
    };
  }

  @Patch(':id/unarchive')
  @ApiOperation({
    summary: 'Unarchive an account',
    description: 'Restores a previously archived account to active status.',
  })
  @ApiOkResponse({
    description: 'Account unarchived successfully',
    type: AccountResponseDto,
  })
  async unarchive(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const account = await this.accountsService.unarchive(userId, id);
    const names = await this.householdService.getAccessibleUserNames(userId);
    return {
      message: ACCOUNT_MESSAGES.UNARCHIVED,
      data: this.accountsService.toSanitized(
        account,
        names.get(account.userId.toString()) ?? '',
      ),
    };
  }
}
