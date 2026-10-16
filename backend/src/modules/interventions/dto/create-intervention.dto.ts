import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { InterventionStatus } from '../enums/intervention.enums';

export class CreateInterventionDto {
  @ApiProperty({ description: 'UUID du client visité' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Date de la visite (ISO)' })
  @IsDateString()
  visitDate: string;

  @ApiPropertyOptional({ description: 'Objet / titre' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @ApiPropertyOptional({ enum: InterventionStatus })
  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anomalies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  suggestions?: string;
}
