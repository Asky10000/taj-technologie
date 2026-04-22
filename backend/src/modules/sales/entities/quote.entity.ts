import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { SaleLine } from './sale-line.entity';
import { QuoteStatus } from '../enums/sales.enums';

@Entity({ name: 'quotes' })
@Index('idx_quotes_number', ['number'], { unique: true })
@Index('idx_quotes_customer', ['customerId'])
@Index('idx_quotes_status', ['status'])
export class Quote extends BaseEntity {
  @ApiProperty({ example: 'DEV-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  number: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({ enum: QuoteStatus })
  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 300, nullable: true })
  subject?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ required: false, description: 'Conditions générales spécifiques' })
  @Column({ name: 'terms', type: 'text', nullable: true })
  terms?: string;

  @ApiProperty()
  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @ApiProperty()
  @Column({ name: 'valid_until', type: 'date' })
  validUntil: Date;

  @ApiProperty({ default: 0 })
  @Column({ name: 'global_discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  globalDiscountPercent: number;

  // ── Totaux (stockés pour les requêtes/rapports) ──────────────
  @Column({ name: 'total_ht', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalHT: number;

  @Column({ name: 'total_tax', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalTax: number;

  @Column({ name: 'total_ttc', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalTTC: number;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ name: 'converted_order_id', type: 'uuid', nullable: true })
  convertedOrderId?: string;

  @Column({ name: 'converted_at', type: 'timestamp with time zone', nullable: true })
  convertedAt?: Date;

  @OneToMany(() => SaleLine, (l) => l.quoteId, { cascade: true, eager: false })
  lines: SaleLine[];

  @BeforeInsert()
  generateNumber(): void {
    if (!this.number) {
      const y = new Date().getFullYear();
      this.number = `DEV-${y}-${Math.floor(Math.random() * 90000 + 10000)}`;
    }
  }
}
