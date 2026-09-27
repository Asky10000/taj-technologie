import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNumber,
  IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSupplierDto } from './create-supplier.dto';
import { PurchaseOrderStatus } from '../enums/supplier.enums';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

// ── Lignes de commande ──────────────────────────────────────────

export class CreatePurchaseOrderLineDto {
  @ApiPropertyOptional({ description: 'UUID du produit (optionnel)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Désignation libre' })
  @IsString()
  @MaxLength(300)
  designation: string;

  @ApiPropertyOptional({ description: 'Référence fournisseur' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierRef?: string;

  @ApiProperty({ description: 'Quantité commandée', minimum: 0.001 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire HT', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Taux TVA (%)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Remise (%)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercent?: number;
}

// ── Commande fournisseur ────────────────────────────────────────

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'UUID du fournisseur' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierReference?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines: CreatePurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierReference?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Changement de statut ────────────────────────────────────────

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;
}

// ── Réception de marchandises ────────────────────────────────────

export class ReceiveLineDto {
  @ApiProperty({ description: 'UUID de la ligne de commande' })
  @IsUUID()
  lineId: string;

  @ApiProperty({ description: 'Quantité reçue', minimum: 0.001 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  receivedQuantity: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiveLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines: ReceiveLineDto[];

  @ApiPropertyOptional({ description: 'Notes de réception' })
  @IsOptional()
  @IsString()
  receptionNotes?: string;
}

// ── Paiement ────────────────────────────────────────────────────

export class RecordPaymentDto {
  @ApiProperty({ description: 'Montant payé', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}
