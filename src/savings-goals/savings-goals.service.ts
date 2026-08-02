import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppException, ResourceNotFoundException } from '../common/exceptions';
import { SAVINGS_GOAL_MESSAGES } from '../common/constants';
import { HouseholdService } from '../household/household.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { SavingsGoalResponseDto } from './dto/savings-goal-response.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import {
  SavingsGoal,
  SavingsGoalDocument,
} from './schemas/savings-goal.schema';

@Injectable()
export class SavingsGoalsService {
  constructor(
    @InjectModel(SavingsGoal.name)
    private readonly savingsGoalModel: Model<SavingsGoal>,
    private readonly householdService: HouseholdService,
  ) {}

  async create(
    userId: string,
    dto: CreateSavingsGoalDto,
  ): Promise<SavingsGoalDocument> {
    return this.savingsGoalModel.create({
      userId,
      name: dto.name,
      targetAmount: dto.targetAmount,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
    });
  }

  async findAll(userId: string): Promise<SavingsGoalDocument[]> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    return this.savingsGoalModel
      .find({ userId: { $in: scopeIds } })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<SavingsGoalDocument> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const goal = await this.savingsGoalModel
      .findOne({ _id: id, userId: { $in: scopeIds } })
      .exec();
    if (!goal) {
      throw new ResourceNotFoundException(SAVINGS_GOAL_MESSAGES.NOT_FOUND);
    }
    return goal;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSavingsGoalDto,
  ): Promise<SavingsGoalDocument> {
    const goal = await this.findOne(userId, id);

    if (dto.name !== undefined) goal.name = dto.name;
    if (dto.targetAmount !== undefined) goal.targetAmount = dto.targetAmount;
    if (dto.targetDate !== undefined) {
      goal.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    }
    if (dto.icon !== undefined) goal.icon = dto.icon;
    if (dto.color !== undefined) goal.color = dto.color;

    await goal.save();
    return goal;
  }

  async remove(userId: string, id: string): Promise<void> {
    const goal = await this.findOne(userId, id);
    await goal.deleteOne();
  }

  /** [amount] positive to contribute, negative to withdraw — the total
   * can never go below zero. */
  async contribute(
    userId: string,
    id: string,
    amount: number,
  ): Promise<SavingsGoalDocument> {
    const goal = await this.findOne(userId, id);

    const newAmount = goal.currentAmount + amount;
    if (newAmount < 0) {
      throw new AppException(SAVINGS_GOAL_MESSAGES.WITHDRAWAL_EXCEEDS_BALANCE);
    }

    goal.currentAmount = newAmount;
    await goal.save();
    return goal;
  }

  toSanitized(goal: SavingsGoalDocument): SavingsGoalResponseDto {
    return {
      id: goal._id.toString(),
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      icon: goal.icon,
      color: goal.color,
      isCompleted: goal.currentAmount >= goal.targetAmount,
      createdAt: (goal as unknown as { createdAt: Date }).createdAt,
      updatedAt: (goal as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
