import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { OccurrenceStatus } from '../enums';
import { PaginationQueryDto } from './pagination-query.dto';

export class QueryHistoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OccurrenceStatus })
  @IsOptional()
  @IsEnum(OccurrenceStatus)
  status?: OccurrenceStatus;

  @ApiPropertyOptional({
    description: 'Scope to a single recurring transaction',
  })
  @IsOptional()
  @IsMongoId()
  recurringTransactionId?: string;
}
