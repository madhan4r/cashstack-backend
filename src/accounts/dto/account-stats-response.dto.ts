import { ApiProperty } from '@nestjs/swagger';

export class AccountStatsResponseDto {
  @ApiProperty({ example: 1250.5 })
  balance!: number;

  @ApiProperty({ example: 4500 })
  totalIncome!: number;

  @ApiProperty({ example: 3249.5 })
  totalExpense!: number;

  @ApiProperty({ example: 42 })
  transactionCount!: number;
}
