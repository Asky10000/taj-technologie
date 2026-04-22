import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { SaleLine } from './sale-line.entity';
import { OrderStatus } from '../enums/sales.enums';

@Entity({ name: 'orders' })
@Index('idx_orders_number', ['number'], { unique: true })
@Index('idx_orders_customer', ['customerId'])
@Index('idx_orders_status', ['status'])
export class Order extends BaseEntity {
  @ApiProperty({ example: 'CMD-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  number: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId?: string;

  @ApiProperty({ enum: OrderStatus })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

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
  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true })
  deliveredAt?: Date;

  @ApiProperty({ required: false, description: 'Adresse de livraison' })
  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress?: string;

  @ApiProperty({ default: 0 })
  @Column({ name: 'global_discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  globalDiscountPercent: number;

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

  @OneToMany(() => SaleLine, (l) => l.orderId, { cascade: true, eager: false })
  lines: SaleLine[];

  @BeforeInsert()
  generateNumber(): void {
    if (!this.number) {
      const y = new Date().getFullYear();
      this.number = `CMD-${y}-${Math.floor(Math.random() * 90000 + 10000)}`;
    }
  }
}
