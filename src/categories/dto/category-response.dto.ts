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

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
