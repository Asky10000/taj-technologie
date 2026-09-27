import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { Contact } from '../../crm/entities/contact.entity';
import {
  TicketStatus, TicketPriority, TicketCategory, TicketSource,
  SLA_RESPONSE_MINUTES, SLA_RESOLUTION_MINUTES,
} from '../enums/ticket.enums';
import { TicketComment } from './ticket-comment.entity';

@Entity({ name: 'tickets' })
@Index('idx_tickets_number', ['number'], { unique: true })
@Index('idx_tickets_status', ['status'])
@Index('idx_tickets_priority', ['priority'])
@Index('idx_tickets_customer', ['customerId'])
@Index('idx_tickets_assigned', ['assignedToId'])
export class Ticket extends BaseEntity {
  @ApiProperty({ example: 'TKT-2024-00001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  number: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: TicketStatus })
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @ApiProperty({ enum: TicketCategory })
  @Column({ type: 'enum', enum: TicketCategory, default: TicketCategory.OTHER })
  category: TicketCategory;

  @ApiProperty({ enum: TicketSource })
  @Column({ type: 'enum', enum: TicketSource, default: TicketSource.PORTAL })
  source: TicketSource;

  // ── Client / contact demandeur ───────────────────────────────
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId?: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact?: Contact;

  // ── Équipe ───────────────────────────────────────────────────
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  // ── SLA ──────────────────────────────────────────────────────
  @ApiProperty({ description: 'Heure limite de première réponse' })
  @Column({ name: 'sla_response_due_at', type: 'timestamp with time zone', nullable: true })
  slaResponseDueAt?: Date;

  @ApiProperty({ description: 'Heure limite de résolution' })
  @Column({ name: 'sla_resolution_due_at', type: 'timestamp with time zone', nullable: true })
  slaResolutionDueAt?: Date;

  @Column({ name: 'first_response_at', type: 'timestamp with time zone', nullable: true })
  firstResponseAt?: Date;

  @Column({ name: 'resolved_at', type: 'timestamp with time zone', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
  closedAt?: Date;

  @ApiProperty({ description: 'SLA première réponse respecté ?' })
  get slaResponseMet(): boolean | null {
    if (!this.firstResponseAt || !this.slaResponseDueAt) return null;
    return this.firstResponseAt <= this.slaResponseDueAt;
  }

  @ApiProperty({ description: 'SLA résolution respecté ?' })
  get slaResolutionMet(): boolean | null {
    if (!this.resolvedAt || !this.slaResolutionDueAt) return null;
    return this.resolvedAt <= this.slaResolutionDueAt;
  }

  // ── Durée facturable ─────────────────────────────────────────
  @ApiProperty({ description: 'Temps passé en minutes (facturable)' })
  @Column({ name: 'time_spent_minutes', type: 'int', default: 0 })
  timeSpentMinutes: number;

  @ApiProperty({ required: false, description: 'Notes de résolution' })
  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string;

  @ApiProperty({ required: false, description: 'Référence matériel / N° de série concerné' })
  @Column({ name: 'asset_reference', type: 'varchar', length: 200, nullable: true })
  assetReference?: string;

  @ApiProperty({ isArray: true, type: String })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  // ── Escalade ─────────────────────────────────────────────────
  @Column({ name: 'escalated_to_id', type: 'uuid', nullable: true })
  escalatedToId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escalated_to_id' })
  escalatedTo?: User;

  @Column({ name: 'escalated_at', type: 'timestamp with time zone', nullable: true })
  escalatedAt?: Date;

  // ── Satisfaction ─────────────────────────────────────────────
  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @Column({ name: 'satisfaction_score', type: 'int', nullable: true })
  satisfactionScore?: number;

  @ApiProperty({ required: false })
  @Column({ name: 'satisfaction_comment', type: 'text', nullable: true })
  satisfactionComment?: string;

  @OneToMany(() => TicketComment, (c) => c.ticket, { cascade: true })
  comments: TicketComment[];

  @BeforeInsert()
  init(): void {
    if (!this.number) {
      const y = new Date().getFullYear();
      const n = String(Math.floor(Math.random() * 90000 + 10000)).padStart(5, '0');
      this.number = `TKT-${y}-${n}`;
    }
    const now = new Date();
    this.slaResponseDueAt = new Date(
      now.getTime() + SLA_RESPONSE_MINUTES[this.priority ?? TicketPriority.MEDIUM] * 60000,
    );
    this.slaResolutionDueAt = new Date(
      now.getTime() + SLA_RESOLUTION_MINUTES[this.priority ?? TicketPriority.MEDIUM] * 60000,
    );
  }
}
