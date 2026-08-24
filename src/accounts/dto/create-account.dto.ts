import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AccountType } from '../enums';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Display name of the account, unique per user',
    example: 'HDFC Savings',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Type of account',
    enum: AccountType,
    example: AccountType.BANK,
  })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiProperty({
    description: 'Opening balance recorded when the account was created',
    example: 1000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  openingBalance!: number;

  @ApiProperty({
    description: 'ISO 4217 currency code',
    example: 'INR',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({
    description: 'Hex color used to represent the account in the UI',
    example: '#4F46E5',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier used to represent the account in the UI',
    example: 'bank',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Free-text notes about the account',
    example: 'Primary salary account',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Balance below which a low-balance push is sent. Omit/null to disable.',
    example: 500,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowBalanceThreshold?: number | null;
}
