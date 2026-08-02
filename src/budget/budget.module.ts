import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { CategoryBudgetController } from './category-budget.controller';
import { CategoryBudgetService } from './category-budget.service';
import { Budget, BudgetSchema } from './schemas/budget.schema';
import {
  CategoryBudget,
  CategoryBudgetSchema,
} from './schemas/category-budget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Budget.name, schema: BudgetSchema },
      { name: CategoryBudget.name, schema: CategoryBudgetSchema },
    ]),
    HouseholdModule,
  ],
  controllers: [BudgetController, CategoryBudgetController],
  providers: [BudgetService, CategoryBudgetService],
  exports: [BudgetService, CategoryBudgetService],
})
export class BudgetModule {}
