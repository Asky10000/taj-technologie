import {
  Entity, Column, ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
import { MemberRole } from '../enums/project.enums';

@Entity({ name: 'project_members' })
@Unique('uq_project_member', ['projectId', 'userId'])
@Index('idx_project_members_project', ['projectId'])
@Index('idx_project_members_user', ['userId'])
export class ProjectMember extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ enum: MemberRole })
  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.TECHNICIAN })
  role: MemberRole;

  @ApiProperty({ required: false, description: 'Taux horaire spécifique sur ce projet' })
  @Column({ name: 'hourly_rate', type: 'numeric', precision: 8, scale: 2, nullable: true })
  hourlyRate?: number;

  @Column({ name: 'joined_at', type: 'date', default: () => 'CURRENT_DATE' })
  joinedAt: Date;
}
