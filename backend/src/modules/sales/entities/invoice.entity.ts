import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { SaleLine } from './sale-line.entity';
import { InvoiceStatus, PaymentMethod } from '../enums/sales.enums';

@Entity({ name: 'invoices' })
@Index('idx_invoices_number', ['number'], { unique: true })
@Index('idx_invoices_customer', ['customerId'])
@Index('idx_invoices_status', ['status'])
@Index('idx_invoices_due_date', ['dueDate'])
export class Invoice extends BaseEntity {
  @ApiProperty({ example: 'FAC-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  number: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string;

  @ApiProperty({ enum: InvoiceStatus })
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 300, nullable: true })
  subject?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'terms', type: 'text', nullable: true })
  terms?: string;

  @ApiProperty()
  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @ApiProperty()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @ApiProperty({ default: 0 })
  @Column({ name: 'global_discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  globalDiscountPercent: number;

  @Column({ name: 'total_ht', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalHT: number;

  @Column({ name: 'total_tax', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalTax: number;

  @Column({ name: 'total_ttc', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalTTC: number;

  @ApiProperty({ description: 'Montant déjà payé' })
  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @ApiProperty({ description: 'Reste à payer = totalTTC - paidAmount' })
  get remainingAmount(): number {
    return Math.round((Number(this.totalTTC) - Number(this.paidAmount)) * 100) / 100;
  }

  @ApiProperty({ required: false })
  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt?: Date;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @Column({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true })
  paymentReference?: string;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @OneToMany(() => SaleLine, (l) => l.invoiceId, { eager: false })
  lines: SaleLine[];

  @BeforeInsert()
  generateNumber(): void {
    if (!this.number) {
      const y = new Date().getFullYear();
      this.number = `FAC-${y}-${Math.floor(Math.random() * 90000 + 10000)}`;
    }
  }
}
