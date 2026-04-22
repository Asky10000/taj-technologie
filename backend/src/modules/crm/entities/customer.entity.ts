import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CustomerType, CustomerStatus } from '../enums/customer.enums';
import { Contact } from './contact.entity';
import { Interaction } from './interaction.entity';

@Entity({ name: 'customers' })
@Index('idx_customers_code', ['code'], { unique: true })
@Index('idx_customers_email', ['email'])
@Index('idx_customers_status', ['status'])
export class Customer extends BaseEntity {
  @ApiProperty({ example: 'CUS-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @ApiProperty({ enum: CustomerType })
  @Column({ type: 'enum', enum: CustomerType, default: CustomerType.COMPANY })
  type: CustomerType;

  @ApiProperty({ example: 'TAJ Consulting SARL' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ example: 'TAJ', required: false })
  @Column({ name: 'legal_name', type: 'varchar', length: 200, nullable: true })
  legalName?: string;

  @ApiProperty({ required: false, description: 'SIRET / numéro entreprise' })
  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId?: string;

  @ApiProperty({ required: false, description: 'Numéro TVA intra' })
  @Column({ name: 'vat_number', type: 'varchar', length: 30, nullable: true })
  vatNumber?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'citext', nullable: true })
  email?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 300, nullable: true })
  website?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'address_line1', type: 'varchar', length: 200, nullable: true })
  addressLine1?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'address_line2', type: 'varchar', length: 200, nullable: true })
  addressLine2?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @ApiProperty({ required: false })
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @ApiProperty({ enum: CustomerStatus })
  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @ApiProperty({ required: false, description: 'Plafond de crédit autorisé' })
  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  creditLimit: number;

  @ApiProperty({
    required: false,
    description: 'Délai de paiement en jours',
    example: 30,
  })
  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ required: false, isArray: true, type: String })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @ApiProperty({ required: false, description: 'Commercial responsable' })
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @OneToMany(() => Contact, (c) => c.customer, { cascade: true })
  contacts: Contact[];

  @OneToMany(() => Interaction, (i) => i.customer)
  interactions: Interaction[];

  @BeforeInsert()
  generateCodeIfMissing(): void {
    if (!this.code) {
      const y = new Date().getFullYear();
      this.code = `CUS-${y}-${Math.floor(Math.random() * 900000 + 100000)}`;
    }
  }
}
