import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType, MovementReason } from '../enums/inventory.enums';

export class CreateMovementDto {
  @ApiProperty({ description: 'UUID du stock (ou du produit via stockId indirect)' })
  @IsUUID()
  stockId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiPropertyOptional({ enum: MovementReason, default: MovementReason.MANUAL })
  @IsOptional()
  @IsEnum(MovementReason)
  reason?: MovementReason;

  @ApiProperty({ description: 'Quantité (toujours positive)', minimum: 0.001 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Prix unitaire au moment du mouvement' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date effective (ISO 8601). Défaut : maintenant' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Type de document source (ex: PURCHASE_ORDER)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ description: 'UUID du document source' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Nouvelle quantité exacte après inventaire physique', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
