import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ProspectStatus, ProspectSource } from '../enums/customer.enums';

export class QueryProspectsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProspectStatus })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus;

  @ApiPropertyOptional({ enum: ProspectSource })
  @IsOptional()
  @IsEnum(ProspectSource)
  source?: ProspectSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
