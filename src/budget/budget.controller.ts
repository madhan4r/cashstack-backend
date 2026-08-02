import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { BUDGET_MESSAGES } from '../common/constants';
import { BudgetResponseDto, SetBudgetDto } from './dto';
import { BudgetService } from './budget.service';

@ApiTags('Budget')
@ApiBearerAuth()
@Controller({ path: 'budget', version: '1' })
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current monthly budget',
    description:
      "Returns the authenticated user's monthly spending limit, or null if they haven't set one.",
  })
  @ApiOkResponse({
    description: 'Budget fetched successfully',
    type: BudgetResponseDto,
  })
  async get(@CurrentUser('sub') userId: string) {
    const amount = await this.budgetService.getAmount(userId);
    return {
      message: BUDGET_MESSAGES.FETCHED,
      data: { amount },
    };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set the monthly budget',
    description:
      'Creates or replaces the monthly spending limit for the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Budget set successfully',
    type: BudgetResponseDto,
  })
  async set(@CurrentUser('sub') userId: string, @Body() dto: SetBudgetDto) {
    const amount = await this.budgetService.set(userId, dto.amount);
    return {
      message: BUDGET_MESSAGES.SET,
      data: { amount },
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear the monthly budget',
    description:
      'Removes the monthly spending limit for the authenticated user.',
  })
  @ApiOkResponse({ description: 'Budget cleared successfully' })
  async clear(@CurrentUser('sub') userId: string) {
    await this.budgetService.clear(userId);
    return {
      message: BUDGET_MESSAGES.CLEARED,
      data: null,
    };
  }
}
