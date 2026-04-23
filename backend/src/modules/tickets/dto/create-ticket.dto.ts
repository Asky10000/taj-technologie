import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID,
  MaxLength, Min, MinLength, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TicketPriority, TicketCategory, TicketSource,
} from '../enums/ticket.enums';

export class CreateTicketDto {
  @ApiProperty()
  @IsString({ message: 'Le titre doit être une chaîne de caractères' })
  @MinLength(5, { message: 'Le titre doit comporter au moins 5 caractères' })
  @MaxLength(300, { message: 'Le titre ne peut pas dépasser 300 caractères' })
  title: string;

  @ApiProperty()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  @MinLength(10, { message: 'La description doit comporter au moins 10 caractères' })
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory, default: TicketCategory.OTHER })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketSource, default: TicketSource.PORTAL })
  @IsOptional()
  @IsEnum(TicketSource)
  source?: TicketSource;

  @ApiPropertyOptional({ description: 'UUID du client' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'UUID du contact demandeur' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'UUID du technicien assigné' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'N° de série ou référence matériel concerné' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assetReference?: string;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
