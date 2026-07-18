import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RecurrenceFrequency, RecurringSort, RecurringStatus } from '../enums';

export class QueryRecurringDto {
  @ApiPropertyOptional({ enum: RecurringStatus })
  @IsOptional()
  @IsEnum(RecurringStatus)
  status?: RecurringStatus;

  @ApiPropertyOptional({ enum: RecurrenceFrequency })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ enum: RecurringSort, default: RecurringSort.NEXT_DUE })
  @IsOptional()
  @IsEnum(RecurringSort)
  sort?: RecurringSort = RecurringSort.NEXT_DUE;
}
