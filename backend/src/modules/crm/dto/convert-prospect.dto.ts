import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CustomerType } from '../enums/customer.enums';

export class ConvertProspectDto {
  @ApiPropertyOptional({
    enum: CustomerType,
    default: CustomerType.COMPANY,
    description: 'Type du client issu de la conversion',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;
}
