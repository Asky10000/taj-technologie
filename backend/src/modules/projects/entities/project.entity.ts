import {
  Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectStatus, ProjectType } from '../enums/project.enums';
import { ProjectMember } from './project-member.entity';
import { ProjectTask } from './project-task.entity';
import { TimeEntry } from './time-entry.entity';

@Entity({ name: 'projects' })
@Index('idx_projects_code', ['code'], { unique: true })
@Index('idx_projects_status', ['status'])
@Index('idx_projects_customer', ['customerId'])
export class Project extends BaseEntity {
  @ApiProperty({ example: 'PRJ-2024-0001' })
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ProjectType })
  @Column({ type: 'enum', enum: ProjectType, default: ProjectType.OTHER })
  type: ProjectType;

  @ApiProperty({ enum: ProjectStatus })
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT })
  status: ProjectStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate?: Date;

  @ApiProperty({ description: 'Budget prévisionnel HT' })
  @Column({ name: 'budget', type: 'numeric', precision: 14, scale: 2, default: 0 })
  budget: number;

  @ApiProperty({ description: 'Coût réel cumulé (calculé depuis les saisies de temps)' })
  @Column({ name: 'actual_cost', type: 'numeric', precision: 14, scale: 2, default: 0 })
  actualCost: number;

  @ApiProperty({ description: 'Avancement en % (0-100)' })
  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ isArray: true, type: String })
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  @OneToMany(() => ProjectMember, (m) => m.project, { cascade: true })
  members: ProjectMember[];

  @OneToMany(() => ProjectTask, (t) => t.project, { cascade: true })
  tasks: ProjectTask[];

  @OneToMany(() => TimeEntry, (e) => e.project)
  timeEntries: TimeEntry[];

  get budgetVariance(): number {
    return Math.round((Number(this.budget) - Number(this.actualCost)) * 100) / 100;
  }

  get isOverBudget(): boolean {
    return Number(this.actualCost) > Number(this.budget) && Number(this.budget) > 0;
  }

  @BeforeInsert()
  generateCode(): void {
    if (!this.code) {
      const y = new Date().getFullYear();
      this.code = `PRJ-${y}-${Math.floor(Math.random() * 90000 + 10000)}`;
    }
  }
}
