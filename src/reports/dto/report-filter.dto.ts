import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransactionType } from '../../transactions/enums';

export class ReportFilterDto {
  @ApiPropertyOptional({
    description: 'Only include transactions on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Only include transactions on or before this date (ISO 8601)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description:
      'Restrict to a single account (matches accountId, fromAccountId, or toAccountId)',
  })
  @IsOptional()
  @IsMongoId()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Restrict to a single category' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Restrict to a single transaction type',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({
    description: 'Restrict to transactions containing any of these tags',
    example: ['groceries', 'weekly'],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown[] =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
