import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class SetBudgetDto {
  @ApiProperty({
    description: 'Monthly spending limit, always positive',
    example: 30000,
  })
  @IsNumber()
  @IsPositive()
  amount!: number;
}
