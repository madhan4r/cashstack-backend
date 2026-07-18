import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../transactions/enums';

export class UpcomingOccurrenceDto {
  @ApiProperty()
  recurringTransactionId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: TransactionType })
  type!: TransactionType;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  dueDate!: Date;
}
