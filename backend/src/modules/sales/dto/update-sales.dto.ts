import { PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';
import { CreateOrderDto } from './create-order.dto';
import { CreateInvoiceDto } from './create-invoice.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../enums/sales.enums';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Montant payé', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}

export class QuerySalesDto {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  status?: string;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
}
