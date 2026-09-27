import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Customer } from './customer.entity';
import { Prospect } from './prospect.entity';

@Entity({ name: 'contacts' })
@Index('idx_contacts_customer', ['customerId'])
@Index('idx_contacts_prospect', ['prospectId'])
export class Contact extends BaseEntity {
  @ApiProperty()
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 150, nullable: true })
  position?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'citext', nullable: true })
  email?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 30, nullable: true })
  mobile?: string;

  @ApiProperty({ default: false })
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, (c) => c.contacts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'prospect_id', type: 'uuid', nullable: true })
  prospectId?: string;

  @ManyToOne(() => Prospect, (p) => p.contacts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'prospect_id' })
  prospect?: Prospect;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
