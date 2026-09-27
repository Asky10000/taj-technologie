import {
  Entity, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';

@Entity({ name: 'time_entries' })
@Index('idx_time_entries_project', ['projectId'])
@Index('idx_time_entries_task', ['taskId'])
@Index('idx_time_entries_user', ['userId'])
@Index('idx_time_entries_date', ['entryDate'])
export class TimeEntry extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.timeEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;

  @ManyToOne(() => ProjectTask, (t) => t.timeEntries, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: ProjectTask;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Durée en heures' })
  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hours: number;

  @ApiProperty()
  @Column({ name: 'entry_date', type: 'date' })
  entryDate: Date;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ default: true, description: 'Temps facturable au client' })
  @Column({ name: 'is_billable', type: 'boolean', default: true })
  isBillable: boolean;

  @ApiProperty({ description: 'Taux horaire appliqué (copié depuis le membre)' })
  @Column({ name: 'hourly_rate', type: 'numeric', precision: 8, scale: 2, default: 0 })
  hourlyRate: number;

  @ApiProperty({ description: 'Coût = hours × hourlyRate' })
  get cost(): number {
    return Math.round(Number(this.hours) * Number(this.hourlyRate) * 100) / 100;
  }
}
