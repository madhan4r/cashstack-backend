import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavingsGoalResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'Trip to Japan' })
  name!: string;

  @ApiProperty({ example: 200000 })
  targetAmount!: number;

  @ApiProperty({ example: 45000 })
  currentAmount!: number;

  @ApiPropertyOptional({ example: '2027-06-01T00:00:00.000Z', nullable: true })
  targetDate!: Date | null;

  @ApiPropertyOptional({ example: 'plane', nullable: true })
  icon!: string | null;

  @ApiPropertyOptional({ example: '#3B82F6', nullable: true })
  color!: string | null;

  @ApiProperty({ example: false })
  isCompleted!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
