import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CategoryBudgetResponseDto, SetCategoryBudgetDto } from './dto';
import { CategoryBudgetService } from './category-budget.service';

@ApiTags('Budget')
@ApiBearerAuth()
@Controller({ path: 'budget/categories', version: '1' })
export class CategoryBudgetController {
  constructor(private readonly categoryBudgetService: CategoryBudgetService) {}

  @Get()
  @ApiOperation({
    summary: 'List per-category budgets',
    description:
      "Returns every category the user has set a monthly limit for, along with that category's spend for the current month.",
  })
  @ApiOkResponse({
    description: 'Category budgets fetched successfully',
    type: [CategoryBudgetResponseDto],
  })
  async getAll(@CurrentUser('sub') userId: string) {
    const data = await this.categoryBudgetService.getAll(userId);
    return {
      message: BUDGET_MESSAGES.CATEGORY_BUDGETS_FETCHED,
      data,
    };
  }

  @Put(':categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a category budget',
    description:
      'Creates or replaces the monthly spending limit for a category.',
  })
  @ApiOkResponse({ description: 'Category budget set successfully' })
  async set(
    @CurrentUser('sub') userId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: SetCategoryBudgetDto,
  ) {
    await this.categoryBudgetService.set(userId, categoryId, dto.amount);
    return {
      message: BUDGET_MESSAGES.CATEGORY_BUDGET_SET,
      data: null,
    };
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear a category budget',
    description: 'Removes the monthly spending limit for a category.',
  })
  @ApiOkResponse({ description: 'Category budget cleared successfully' })
  async clear(
    @CurrentUser('sub') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    await this.categoryBudgetService.clear(userId, categoryId);
    return {
      message: BUDGET_MESSAGES.CATEGORY_BUDGET_CLEARED,
      data: null,
    };
  }
}
