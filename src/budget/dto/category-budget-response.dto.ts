import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryBudgetResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a8' })
  categoryId!: string;

  @ApiProperty({ example: 'Food & Dining' })
  categoryName!: string;

  @ApiPropertyOptional({ example: 'utensils', nullable: true })
  categoryIcon!: string | null;

  @ApiPropertyOptional({ example: '#F97316', nullable: true })
  categoryColor!: string | null;

  @ApiProperty({ example: 5000 })
  amount!: number;

  @ApiProperty({
    example: 3200,
    description: "This category's spend for the current month",
  })
  spent!: number;
}
