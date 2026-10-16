import {
  Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { InterventionStatus } from '../enums/intervention.enums';

/**
 * Intervention terrain : compte-rendu de la visite d'un technicien chez un
 * client (anomalies constatées, observations et suggestions).
 */
@Entity({ name: 'interventions' })
@Index('idx_interventions_number', ['number'], { unique: true })
@Index('idx_interventions_customer', ['customerId'])
@Index('idx_interventions_status', ['status'])
export class Intervention extends BaseEntity {
  @ApiProperty({ example: 'INT-2026-00001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  number: string;

  @ApiPropertyOptional({ description: 'Objet / titre de l\'intervention' })
  @Column({ type: 'varchar', length: 300, nullable: true })
  subject?: string;

  @ApiProperty({ enum: InterventionStatus })
  @Column({ type: 'enum', enum: InterventionStatus, default: InterventionStatus.DRAFT })
  status: InterventionStatus;

  @ApiProperty({ description: 'Date de la visite sur site' })
  @Column({ name: 'visit_date', type: 'timestamp with time zone' })
  visitDate: Date;

  @ApiPropertyOptional({ description: 'Anomalies constatées' })
  @Column({ type: 'text', nullable: true })
  anomalies?: string;

  @ApiPropertyOptional({ description: 'Observations' })
  @Column({ type: 'text', nullable: true })
  observations?: string;

  @ApiPropertyOptional({ description: 'Suggestions / recommandations' })
  @Column({ type: 'text', nullable: true })
  suggestions?: string;

  // ── Client visité ────────────────────────────────────────────
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  // ── Technicien (auteur du compte-rendu) ──────────────────────
  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  technicianId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'technician_id' })
  technician?: User;

  @BeforeInsert()
  init(): void {
    if (!this.number) {
      const y = new Date().getFullYear();
      const n = String(Math.floor(Math.random() * 90000 + 10000)).padStart(5, '0');
      this.number = `INT-${y}-${n}`;
    }
    if (!this.visitDate) this.visitDate = new Date();
  }
}
