import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionType } from '../enums';

export class TransactionResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 1500 })
  amount!: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  type!: TransactionType;

  @ApiPropertyOptional({ example: '64f1c2e5b3f1a2c3d4e5f6a7', nullable: true })
  accountId!: string | null;

  @ApiPropertyOptional({ example: '64f1c2e5b3f1a2c3d4e5f6a8', nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  fromAccountId!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  toAccountId!: string | null;

  @ApiPropertyOptional({ example: 'Weekly groceries', nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  transactionDate!: Date;

  @ApiProperty({ example: ['groceries', 'weekly'], type: [String] })
  tags!: string[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedTransactionsResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  items!: TransactionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
