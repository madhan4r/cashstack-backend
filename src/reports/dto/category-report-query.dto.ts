import { IntersectionType } from '@nestjs/swagger';
import { ReportFilterDto } from './report-filter.dto';
import { PaginationQueryDto } from './pagination-query.dto';

export class CategoryReportQueryDto extends IntersectionType(
  ReportFilterDto,
  PaginationQueryDto,
) {}
