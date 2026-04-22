import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { StockAlertLevel } from '../enums/inventory.enums';

export class QueryStockDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Uniquement les articles en alerte ou rupture' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  alertOnly?: boolean;

  @ApiPropertyOptional({ description: 'Uniquement les articles en rupture (qty = 0)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  outOfStock?: boolean;
}

export class QueryMovementsDto extends PaginationDto {}
