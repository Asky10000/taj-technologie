import {
  Entity, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from './ticket.entity';

@Entity({ name: 'ticket_comments' })
@Index('idx_comments_ticket', ['ticketId'])
export class TicketComment extends BaseEntity {
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ApiProperty()
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: 'true = note interne (non visible par le client)' })
  @Column({ name: 'is_internal', type: 'boolean', default: false })
  isInternal: boolean;

  @ApiProperty({ description: 'true = première réponse officielle au client' })
  @Column({ name: 'is_first_response', type: 'boolean', default: false })
  isFirstResponse: boolean;

  @ApiProperty({ description: 'Temps passé sur cette intervention (minutes)' })
  @Column({ name: 'time_spent_minutes', type: 'int', default: 0 })
  timeSpentMinutes: number;

  @ApiProperty({ isArray: true, type: String, description: 'URLs des pièces jointes' })
  @Column({ name: 'attachments', type: 'text', array: true, default: () => "'{}'" })
  attachments: string[];

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author?: User;
}
