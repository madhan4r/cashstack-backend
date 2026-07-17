import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '../enums';

export class AccountResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'HDFC Savings' })
  name!: string;

  @ApiProperty({ enum: AccountType, example: AccountType.BANK })
  type!: AccountType;

  @ApiProperty({ example: 1000 })
  openingBalance!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiPropertyOptional({ example: '#4F46E5', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ example: 'bank', nullable: true })
  icon!: string | null;

  @ApiProperty({ example: false })
  isArchived!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
