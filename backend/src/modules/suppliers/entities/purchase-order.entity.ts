import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';
import { PurchaseOrderStatus, PaymentStatus } from '../enums/supplier.enums';

@Entity({ name: 'purchase_orders' })
@Index('idx_po_code', ['code'], { unique: true })
@Index('idx_po_supplier', ['supplierId'])
@Index('idx_po_status', ['status'])
export class PurchaseOrder extends BaseEntity {
  @ApiProperty({ example: 'ACH-2024-00001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, (s) => s.purchaseOrders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @ApiProperty({ enum: PurchaseOrderStatus })
  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @ApiProperty({ required: false, description: 'Date de livraison attendue' })
  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @ApiProperty({ required: false, description: 'Date de réception effective' })
  @Column({ name: 'received_at', type: 'timestamp with time zone', nullable: true })
  receivedAt?: Date;

  @ApiProperty({ required: false, description: 'Date d\'envoi au fournisseur' })
  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt?: Date;

  @ApiProperty({ description: 'Référence de la commande côté fournisseur', required: false })
  @Column({ name: 'supplier_reference', type: 'varchar', length: 100, nullable: true })
  supplierReference?: string;

  @ApiProperty({ description: 'Frais de livraison HT', default: 0 })
  @Column({ name: 'shipping_cost', type: 'numeric', precision: 14, scale: 2, default: 0 })
  shippingCost: number;

  @ApiProperty({ description: 'Montant payé (acomptes cumulés)', default: 0 })
  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => PurchaseOrderLine, (l) => l.purchaseOrder, { cascade: true, eager: false })
  lines: PurchaseOrderLine[];

  // ── Getters calculés ─────────────────────────────────────────

  get totalHT(): number {
    if (!this.lines?.length) return 0;
    const sum = this.lines.reduce((s, l) => s + l.subtotalHT, 0);
    return Math.round((sum + Number(this.shippingCost)) * 100) / 100;
  }

  get totalTVA(): number {
    if (!this.lines?.length) return 0;
    return Math.round(this.lines.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100;
  }

  get totalTTC(): number {
    return Math.round((this.totalHT + this.totalTVA) * 100) / 100;
  }

  get remainingAmount(): number {
    return Math.max(0, Math.round((this.totalTTC - Number(this.paidAmount)) * 100) / 100);
  }

  @BeforeInsert()
  generateCode(): void {
    if (!this.code) {
      const y = new Date().getFullYear();
      const n = Math.floor(Math.random() * 90000 + 10000);
      this.code = `ACH-${y}-${n}`;
    }
  }
}
