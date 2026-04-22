import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { DiscountType } from '../enums/sales.enums';

/**
 * Ligne générique réutilisée par Quote, Order et Invoice.
 * Le champ discriminant (quoteId / orderId / invoiceId) indique le parent.
 */
@Entity({ name: 'sale_lines' })
@Index('idx_sale_lines_quote', ['quoteId'])
@Index('idx_sale_lines_order', ['orderId'])
@Index('idx_sale_lines_invoice', ['invoiceId'])
export class SaleLine extends BaseEntity {
  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId?: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId?: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  description: string;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 14, scale: 3, default: 1 })
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire HT' })
  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 4 })
  unitPrice: number;

  @ApiProperty({ enum: DiscountType, required: false })
  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENT,
  })
  discountType: DiscountType;

  @ApiProperty({ default: 0 })
  @Column({ name: 'discount_value', type: 'numeric', precision: 8, scale: 4, default: 0 })
  discountValue: number;

  @ApiProperty({ description: 'Taux de TVA (%)' })
  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 20 })
  taxRate: number;

  @ApiProperty({ description: 'Ordre d\'affichage' })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  // ── Getters calculés ────────────────────────────────────────
  get discountAmount(): number {
    const qty = Number(this.quantity);
    const up = Number(this.unitPrice);
    if (this.discountType === DiscountType.PERCENT) {
      return Math.round(qty * up * (Number(this.discountValue) / 100) * 10000) / 10000;
    }
    return Number(this.discountValue);
  }

  get subtotalHT(): number {
    const qty = Number(this.quantity);
    const up = Number(this.unitPrice);
    return Math.round((qty * up - this.discountAmount) * 100) / 100;
  }

  get taxAmount(): number {
    return Math.round(this.subtotalHT * (Number(this.taxRate) / 100) * 100) / 100;
  }

  get totalTTC(): number {
    return Math.round((this.subtotalHT + this.taxAmount) * 100) / 100;
  }
}
