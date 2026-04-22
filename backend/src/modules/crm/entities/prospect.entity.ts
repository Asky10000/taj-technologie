import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from './customer.entity';
import { Contact } from './contact.entity';
import { Interaction } from './interaction.entity';
import { ProspectStatus, ProspectSource } from '../enums/customer.enums';

@Entity({ name: 'prospects' })
@Index('idx_prospects_code', ['code'], { unique: true })
@Index('idx_prospects_status', ['status'])
@Index('idx_prospects_assigned', ['assignedToId'])
export class Prospect extends BaseEntity {
  @ApiProperty({ example: 'PRO-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 200 })
  name: string;

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
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @ApiProperty({ required: false, description: 'Secteur d\'activité' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  industry?: string;

  @ApiProperty({ enum: ProspectStatus })
  @Column({ type: 'enum', enum: ProspectStatus, default: ProspectStatus.NEW })
  status: ProspectStatus;

  @ApiProperty({ enum: ProspectSource })
  @Column({ type: 'enum', enum: ProspectSource, default: ProspectSource.OTHER })
  source: ProspectSource;

  @ApiProperty({ required: false, description: 'Budget estimé' })
  @Column({
    name: 'estimated_budget',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  estimatedBudget?: number;

  @ApiProperty({
    required: false,
    description: 'Score de qualification 0-100',
    minimum: 0,
    maximum: 100,
  })
  @Column({ type: 'int', default: 0 })
  score: number;

  @ApiProperty({ required: false })
  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate?: Date;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ required: false, isArray: true, type: String })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ name: 'converted_customer_id', type: 'uuid', nullable: true })
  convertedCustomerId?: string;

  @OneToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'converted_customer_id' })
  convertedCustomer?: Customer;

  @Column({ name: 'converted_at', type: 'timestamp with time zone', nullable: true })
  convertedAt?: Date;

  @OneToMany(() => Contact, (c) => c.prospect, { cascade: true })
  contacts: Contact[];

  @OneToMany(() => Interaction, (i) => i.prospect)
  interactions: Interaction[];

  @BeforeInsert()
  generateCodeIfMissing(): void {
    if (!this.code) {
      const y = new Date().getFullYear();
      this.code = `PRO-${y}-${Math.floor(Math.random() * 900000 + 100000)}`;
    }
  }
}
