import {
  Entity, Column, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
import { TimeEntry } from './time-entry.entity';
import { TaskStatus, TaskPriority } from '../enums/project.enums';

@Entity({ name: 'project_tasks' })
@Index('idx_tasks_project', ['projectId'])
@Index('idx_tasks_assignee', ['assigneeId'])
@Index('idx_tasks_status', ['status'])
@Index('idx_tasks_parent', ['parentTaskId'])
export class ProjectTask extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: TaskStatus })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiProperty({ description: 'Durée estimée en heures' })
  @Column({ name: 'estimated_hours', type: 'numeric', precision: 8, scale: 2, default: 0 })
  estimatedHours: number;

  @ApiProperty({ description: 'Heures réelles passées (calculé)' })
  @Column({ name: 'actual_hours', type: 'numeric', precision: 8, scale: 2, default: 0 })
  actualHours: number;

  @ApiProperty({ required: false })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'Avancement en % (0-100)' })
  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @ApiProperty({ default: 0 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User;

  // Sous-tâches
  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string;

  @ManyToOne(() => ProjectTask, (t) => t.subTasks, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: ProjectTask;

  @OneToMany(() => ProjectTask, (t) => t.parentTask)
  subTasks: ProjectTask[];

  @OneToMany(() => TimeEntry, (e) => e.task)
  timeEntries: TimeEntry[];

  get isOverdue(): boolean {
    if (!this.dueDate || this.status === TaskStatus.DONE) return false;
    return new Date() > new Date(this.dueDate);
  }
}
