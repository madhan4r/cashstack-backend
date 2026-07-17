import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportFilterDto } from './report-filter.dto';

export class MonthlyReportQueryDto extends ReportFilterDto {
  @ApiPropertyOptional({
    description: 'Year to report on (defaults to the current year)',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(9999)
  year?: number;

  @ApiPropertyOptional({
    description: 'Month to report on, 1-12 (defaults to the current month)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
