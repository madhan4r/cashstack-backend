import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../transactions/enums';
import { RecurrenceFrequency, RecurringStatus, ReminderOption } from '../enums';

export class RecurringResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'Netflix Subscription' })
  name!: string;

  @ApiProperty({ enum: TransactionType })
  type!: TransactionType;

  @ApiProperty({ example: 649 })
  amount!: number;

  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  categoryId!: string;

  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  accountId!: string;

  @ApiPropertyOptional({ example: '4K plan', nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: RecurrenceFrequency })
  frequency!: RecurrenceFrequency;

  @ApiPropertyOptional({ nullable: true, example: null })
  customIntervalDays!: number | null;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  startDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  endDate!: Date | null;

  @ApiProperty({ enum: ReminderOption })
  reminder!: ReminderOption;

  @ApiProperty({ example: true })
  autoGenerate!: boolean;

  @ApiProperty({ enum: RecurringStatus })
  status!: RecurringStatus;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  nextDueDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  lastGeneratedDate!: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
