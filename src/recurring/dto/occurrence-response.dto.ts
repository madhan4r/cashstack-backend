import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OccurrenceStatus } from '../enums';

export class OccurrenceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  recurringTransactionId!: string;

  @ApiProperty({ example: 'Netflix Subscription' })
  name!: string;

  @ApiProperty({ example: 649 })
  amount!: number;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  dueDate!: Date;

  @ApiProperty({ enum: OccurrenceStatus })
  status!: OccurrenceStatus;

  @ApiPropertyOptional({ nullable: true })
  transactionId!: string | null;
}

export class PaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OccurrenceHistoryDto {
  @ApiProperty({ type: [OccurrenceResponseDto] })
  items!: OccurrenceResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
