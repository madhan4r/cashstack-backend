import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryStatsService } from './services/category-stats.service';
import { Category, CategorySchema } from './schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    HouseholdModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryStatsService],
  exports: [CategoriesService, CategoryStatsService],
})
export class CategoriesModule {}
