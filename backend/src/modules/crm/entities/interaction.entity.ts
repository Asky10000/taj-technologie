import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from './customer.entity';
import { Prospect } from './prospect.entity';
import { InteractionType } from '../enums/customer.enums';

@Entity({ name: 'interactions' })
@Index('idx_interactions_customer', ['customerId'])
@Index('idx_interactions_prospect', ['prospectId'])
@Index('idx_interactions_occurred_at', ['occurredAt'])
export class Interaction extends BaseEntity {
  @ApiProperty({ enum: InteractionType })
  @Column({ type: 'enum', enum: InteractionType, default: InteractionType.NOTE })
  type: InteractionType;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  subject: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty()
  @Column({ name: 'occurred_at', type: 'timestamp with time zone' })
  occurredAt: Date;

  @ApiProperty({
    required: false,
    description: 'Durée en minutes (call/meeting)',
  })
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, (c) => c.interactions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'prospect_id', type: 'uuid', nullable: true })
  prospectId?: string;

  @ManyToOne(() => Prospect, (p) => p.interactions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'prospect_id' })
  prospect?: Prospect;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;
}
