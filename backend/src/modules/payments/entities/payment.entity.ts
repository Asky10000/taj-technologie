import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../sales/entities/invoice.entity';
import { PurchaseOrder } from '../../suppliers/entities/purchase-order.entity';
import { PaymentMethod } from '../../sales/enums/sales.enums';

/**
 * Paiement tracé : une ligne par encaissement (facture client) ou règlement
 * (commande fournisseur), avec éventuellement une image de preuve.
 */
@Entity({ name: 'payments' })
@Index('idx_payments_invoice', ['invoiceId'])
@Index('idx_payments_purchase_order', ['purchaseOrderId'])
export class Payment extends BaseEntity {
  @ApiProperty({ description: 'Montant du paiement' })
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Référence (n° de transaction, chèque…)' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  reference?: string;

  @ApiProperty({ description: 'Date du paiement' })
  @Column({ name: 'paid_at', type: 'timestamp with time zone' })
  paidAt: Date;

  @ApiPropertyOptional({ description: 'URL de l\'image de preuve' })
  @Column({ name: 'proof_url', type: 'varchar', length: 500, nullable: true })
  proofUrl?: string;

  // ── Rattachement (facture OU commande fournisseur) ───────────
  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId?: string;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId?: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  // ── Auteur ───────────────────────────────────────────────────
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}
