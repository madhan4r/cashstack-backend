import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class SetCategoryBudgetDto {
  @ApiProperty({
    description: 'Monthly spending limit for this category, always positive',
    example: 5000,
  })
  @IsNumber()
  @IsPositive()
  amount!: number;
}
