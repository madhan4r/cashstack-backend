import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SavingsGoalDeadlineScheduler } from './savings-goal-deadline.scheduler';
import { SavingsGoalsController } from './savings-goals.controller';
import { SavingsGoalsService } from './savings-goals.service';
import { SavingsGoal, SavingsGoalSchema } from './schemas/savings-goal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavingsGoal.name, schema: SavingsGoalSchema },
    ]),
    HouseholdModule,
    NotificationsModule,
  ],
  controllers: [SavingsGoalsController],
  providers: [SavingsGoalsService, SavingsGoalDeadlineScheduler],
})
export class SavingsGoalsModule {}
