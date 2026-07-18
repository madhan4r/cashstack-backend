import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '../../transactions/enums';
import { RecurrenceFrequency, ReminderOption } from '../enums';

export class CreateRecurringDto {
  @ApiProperty({
    description: 'Display name, e.g. "Netflix Subscription"',
    example: 'Netflix Subscription',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Only INCOME or EXPENSE — recurring transfers are not supported',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: 649 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  @IsMongoId()
  categoryId!: string;

  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  @IsMongoId()
  accountId!: string;

  @ApiPropertyOptional({ example: '4K plan', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ enum: RecurrenceFrequency, example: RecurrenceFrequency.MONTHLY })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'Interval in days — required when frequency is CUSTOM',
    example: 10,
  })
  @ValidateIf((dto: CreateRecurringDto) => dto.frequency === RecurrenceFrequency.CUSTOM)
  @IsInt()
  @Min(1)
  customIntervalDays?: number;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReminderOption, example: ReminderOption.ONE_DAY_BEFORE })
  @IsOptional()
  @IsEnum(ReminderOption)
  reminder?: ReminderOption;

  @ApiPropertyOptional({
    description: 'Automatically create the actual transaction when due (default true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;
}
