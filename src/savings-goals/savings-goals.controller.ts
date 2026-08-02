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
import { SAVINGS_GOAL_MESSAGES } from '../common/constants';
import {
  ContributeSavingsGoalDto,
  CreateSavingsGoalDto,
  SavingsGoalResponseDto,
  UpdateSavingsGoalDto,
} from './dto';
import { SavingsGoalsService } from './savings-goals.service';

@ApiTags('Savings Goals')
@ApiBearerAuth()
@Controller({ path: 'savings-goals', version: '1' })
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a savings goal' })
  @ApiCreatedResponse({
    description: 'Savings goal created successfully',
    type: SavingsGoalResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSavingsGoalDto,
  ) {
    const goal = await this.savingsGoalsService.create(userId, dto);
    return {
      message: SAVINGS_GOAL_MESSAGES.CREATED,
      data: this.savingsGoalsService.toSanitized(goal),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List savings goals' })
  @ApiOkResponse({
    description: 'Savings goals fetched successfully',
    type: [SavingsGoalResponseDto],
  })
  async findAll(@CurrentUser('sub') userId: string) {
    const goals = await this.savingsGoalsService.findAll(userId);
    return {
      message: SAVINGS_GOAL_MESSAGES.LIST_FETCHED,
      data: goals.map((g) => this.savingsGoalsService.toSanitized(g)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a savings goal' })
  @ApiOkResponse({
    description: 'Savings goal fetched successfully',
    type: SavingsGoalResponseDto,
  })
  async findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const goal = await this.savingsGoalsService.findOne(userId, id);
    return {
      message: SAVINGS_GOAL_MESSAGES.FETCHED,
      data: this.savingsGoalsService.toSanitized(goal),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  @ApiOkResponse({
    description: 'Savings goal updated successfully',
    type: SavingsGoalResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    const goal = await this.savingsGoalsService.update(userId, id, dto);
    return {
      message: SAVINGS_GOAL_MESSAGES.UPDATED,
      data: this.savingsGoalsService.toSanitized(goal),
    };
  }

  @Patch(':id/contribute')
  @ApiOperation({
    summary: 'Contribute to or withdraw from a savings goal',
    description: 'Positive amount contributes, negative amount withdraws.',
  })
  @ApiOkResponse({
    description: 'Contribution recorded successfully',
    type: SavingsGoalResponseDto,
  })
  async contribute(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ContributeSavingsGoalDto,
  ) {
    const goal = await this.savingsGoalsService.contribute(
      userId,
      id,
      dto.amount,
    );
    return {
      message: SAVINGS_GOAL_MESSAGES.CONTRIBUTED,
      data: this.savingsGoalsService.toSanitized(goal),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a savings goal' })
  @ApiOkResponse({ description: 'Savings goal deleted successfully' })
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.savingsGoalsService.remove(userId, id);
    return {
      message: SAVINGS_GOAL_MESSAGES.DELETED,
      data: null,
    };
  }
}
