import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportPeriod {
  DAY   = 'DAY',
  WEEK  = 'WEEK',
  MONTH = 'MONTH',
  YEAR  = 'YEAR',
}

export enum ReportGroupBy {
  DAY   = 'day',
  WEEK  = 'week',
  MONTH = 'month',
}

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'Date de début ISO 8601 (ex: 2024-01-01)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date de fin ISO 8601 (ex: 2024-12-31)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ReportGroupBy, default: ReportGroupBy.MONTH })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;

  @ApiPropertyOptional({ description: 'Limite sur les tops (ex: top 10)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
