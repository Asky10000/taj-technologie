import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleLineDto } from './sale-line.dto';

export class CreateQuoteDto {
  @ApiProperty({ description: 'UUID du client' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiProperty({ description: 'Date d\'émission ISO 8601' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Date de validité ISO 8601' })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  globalDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiProperty({ isArray: true, type: SaleLineDto })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines: SaleLineDto[];
}
