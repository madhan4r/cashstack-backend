import { ApiPropertyOptional } from '@nestjs/swagger';

export class BudgetResponseDto {
  @ApiPropertyOptional({
    example: 30000,
    nullable: true,
    description: 'Monthly spending limit, or null if none has been set',
  })
  amount!: number | null;
}
