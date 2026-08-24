import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetAlertService } from './budget-alert.service';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { CategoryBudgetController } from './category-budget.controller';
import { CategoryBudgetService } from './category-budget.service';
import { Budget, BudgetSchema } from './schemas/budget.schema';
import { BudgetAlert, BudgetAlertSchema } from './schemas/budget-alert.schema';
import {
  CategoryBudget,
  CategoryBudgetSchema,
} from './schemas/category-budget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Budget.name, schema: BudgetSchema },
      { name: CategoryBudget.name, schema: CategoryBudgetSchema },
      { name: BudgetAlert.name, schema: BudgetAlertSchema },
    ]),
    HouseholdModule,
    NotificationsModule,
  ],
  controllers: [BudgetController, CategoryBudgetController],
  providers: [BudgetService, CategoryBudgetService, BudgetAlertService],
  exports: [BudgetService, CategoryBudgetService, BudgetAlertService],
})
export class BudgetModule {}
