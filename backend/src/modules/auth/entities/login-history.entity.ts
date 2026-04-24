import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

@Entity({ name: 'login_history' })
@Index('idx_login_history_user', ['userId'])
@Index('idx_login_history_created', ['createdAt'])
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: LoginStatus.SUCCESS,
  })
  status: LoginStatus;

  @Column({ name: 'email_attempted', type: 'varchar', length: 255, nullable: true })
  emailAttempted?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'failure_reason', type: 'varchar', length: 100, nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
