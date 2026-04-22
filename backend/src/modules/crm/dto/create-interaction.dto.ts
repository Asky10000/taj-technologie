import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InteractionType } from '../enums/customer.enums';

export class CreateInteractionDto {
  @ApiProperty({ enum: InteractionType })
  @IsEnum(InteractionType)
  type: InteractionType;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date/heure ISO 8601 de l\'interaction' })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional({ description: 'Durée en minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateInteractionDto) => !o.prospectId)
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateInteractionDto) => !o.customerId)
  @IsUUID()
  prospectId?: string;
}
