import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { InterventionStatus } from '../enums/intervention.enums';

export class QueryInterventionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InterventionStatus })
  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @ApiPropertyOptional({ description: 'Filtrer par client' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
