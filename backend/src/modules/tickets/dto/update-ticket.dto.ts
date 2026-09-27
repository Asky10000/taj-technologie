import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, Max, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketStatus } from '../enums/ticket.enums';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({ description: 'Notes de résolution (requis pour RESOLVED/CLOSED)' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({ description: 'Temps total passé en minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpentMinutes?: number;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'UUID du technicien' })
  @IsUUID()
  assignedToId: string;
}

export class EscalateTicketDto {
  @ApiProperty({ description: 'UUID du responsable escalade' })
  @IsUUID()
  escalatedToId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SatisfactionDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
