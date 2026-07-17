import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TransactionSort, TransactionType } from '../enums';

export class QueryTransactionsDto {
  @ApiPropertyOptional({
    description: 'Filter by an exact transaction date (ISO 8601 date)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by month (1-12)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by year', example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(9999)
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({
    description:
      'Filter by account ID (matches accountId, fromAccountId, or toAccountId)',
  })
  @IsOptional()
  @IsMongoId()
  account?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Free-text search across notes and tags',
    example: 'groceries',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number, starting at 1',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: TransactionSort,
    default: TransactionSort.NEWEST,
  })
  @IsOptional()
  @IsEnum(TransactionSort)
  sort?: TransactionSort = TransactionSort.NEWEST;
}
