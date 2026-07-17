import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CategoryType } from '../enums';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Display name of the category, unique per user and type',
    example: 'Groceries',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Whether this category tracks income or expense',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsEnum(CategoryType)
  type!: CategoryType;

  @ApiPropertyOptional({
    description: 'Icon identifier used to represent the category in the UI',
    example: 'shopping-cart',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Hex color used to represent the category in the UI',
    example: '#F59E0B',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
