import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '../enums';

export class CategoryResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'Groceries' })
  name!: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  type!: CategoryType;

  @ApiPropertyOptional({ example: 'shopping-cart', nullable: true })
  icon!: string | null;

  @ApiPropertyOptional({ example: '#F59E0B', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({
    example: 'Groceries and supermarket runs',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: false })
  isArchived!: boolean;

  @ApiProperty({
    example: 42,
    description: 'Number of transactions recorded against this category',
  })
  transactionCount!: number;

  @ApiProperty({
    example: 1250.5,
    description: 'Sum of every transaction amount recorded against this category',
  })
  totalAmount!: number;

  @ApiPropertyOptional({
    example: '2024-06-01T00:00:00.000Z',
    nullable: true,
    description: 'Date of the most recent transaction using this category',
  })
  lastUsedAt!: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
