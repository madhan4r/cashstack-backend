import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaymentMethod, TransactionType } from '../enums';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction amount, always positive',
    example: 1500,
  })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    description: 'Type of transaction',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiPropertyOptional({
    description:
      'Account the transaction applies to. Required for INCOME/EXPENSE, ignored for TRANSFER.',
    example: '64f1c2e5b3f1a2c3d4e5f6a7',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) => dto.type !== TransactionType.TRANSFER,
  )
  @IsMongoId()
  accountId?: string;

  @ApiPropertyOptional({
    description:
      'Category the transaction applies to. Required for INCOME/EXPENSE, ignored for TRANSFER.',
    example: '64f1c2e5b3f1a2c3d4e5f6a8',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) => dto.type !== TransactionType.TRANSFER,
  )
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Source account for a TRANSFER. Required for TRANSFER, ignored otherwise.',
    example: '64f1c2e5b3f1a2c3d4e5f6a9',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) => dto.type === TransactionType.TRANSFER,
  )
  @IsMongoId()
  fromAccountId?: string;

  @ApiPropertyOptional({
    description:
      'Destination account for a TRANSFER. Required for TRANSFER, ignored otherwise.',
    example: '64f1c2e5b3f1a2c3d4e5f6aa',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) => dto.type === TransactionType.TRANSFER,
  )
  @IsMongoId()
  toAccountId?: string;

  @ApiPropertyOptional({
    description: 'Free-form notes',
    example: 'Weekly groceries',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Date the transaction occurred (ISO 8601)',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({
    description: 'Free-form tags',
    example: ['groceries', 'weekly'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Type(() => String)
  tags?: string[];
}
