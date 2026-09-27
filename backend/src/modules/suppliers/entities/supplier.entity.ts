import {
  Entity, Column, Index, OneToMany, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { SupplierStatus } from '../enums/supplier.enums';
import { PurchaseOrder } from './purchase-order.entity';

@Entity({ name: 'suppliers' })
@Index('idx_suppliers_code', ['code'], { unique: true })
@Index('idx_suppliers_status', ['status'])
export class Supplier extends BaseEntity {
  @ApiProperty({ example: 'FRN-2024-00001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 200, nullable: true })
  website?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 300, nullable: true })
  address?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true, default: 'France' })
  country?: string;

  @ApiProperty({ required: false, description: 'N° SIRET ou équivalent' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId?: string;

  @ApiProperty({ enum: SupplierStatus })
  @Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  status: SupplierStatus;

  @ApiProperty({ description: 'Délai de paiement en jours', default: 30 })
  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays: number;

  @ApiProperty({ description: 'Devise (ISO 4217)', default: 'EUR' })
  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Note interne (1-5)', required: false })
  @Column({ type: 'int', nullable: true })
  rating?: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ isArray: true, type: String })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  purchaseOrders: PurchaseOrder[];

  @BeforeInsert()
  generateCode(): void {
    if (!this.code) {
      const y = new Date().getFullYear();
      const n = Math.floor(Math.random() * 90000 + 10000);
      this.code = `FRN-${y}-${n}`;
    }
  }
}
