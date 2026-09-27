import {
  Entity, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity({ name: 'purchase_order_lines' })
@Index('idx_po_lines_order', ['purchaseOrderId'])
@Index('idx_po_lines_product', ['productId'])
export class PurchaseOrderLine extends BaseEntity {
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ApiProperty({ description: 'Désignation (copie au moment de la commande)' })
  @Column({ type: 'varchar', length: 300 })
  designation: string;

  @ApiProperty({ description: 'Référence fournisseur' })
  @Column({ name: 'supplier_ref', type: 'varchar', length: 100, nullable: true })
  supplierRef?: string;

  @ApiProperty({ description: 'Quantité commandée' })
  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Quantité reçue (réception partielle)' })
  @Column({ name: 'received_quantity', type: 'numeric', precision: 12, scale: 3, default: 0 })
  receivedQuantity: number;

  @ApiProperty({ description: 'Prix unitaire HT d\'achat' })
  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 4 })
  unitPrice: number;

  @ApiProperty({ description: 'Taux de TVA (%)', default: 20 })
  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 20 })
  taxRate: number;

  @ApiProperty({ description: 'Remise (%)', default: 0 })
  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  get subtotalHT(): number {
    const base = Number(this.quantity) * Number(this.unitPrice);
    return Math.round(base * (1 - Number(this.discountPercent) / 100) * 100) / 100;
  }

  get taxAmount(): number {
    return Math.round(this.subtotalHT * (Number(this.taxRate) / 100) * 100) / 100;
  }

  get totalTTC(): number {
    return Math.round((this.subtotalHT + this.taxAmount) * 100) / 100;
  }

  get remainingQuantity(): number {
    return Math.max(0, Number(this.quantity) - Number(this.receivedQuantity));
  }
}
