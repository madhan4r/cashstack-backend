import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, NotEquals } from 'class-validator';

export class ContributeSavingsGoalDto {
  @ApiProperty({
    description:
      'Amount to add to the goal. Use a negative value to withdraw — the ' +
      "total can't go below zero.",
    example: 5000,
  })
  @IsNumber()
  @NotEquals(0)
  amount!: number;
}
