import { Entity, Column, Index, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Role } from '../../auth/enums/role.enum';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

@Entity({ name: 'users' })
@Index('idx_users_email', ['email'], { unique: true })
export class User extends BaseEntity {
  @ApiProperty({ example: 'jean.dupont@taj-tech.com' })
  @Column({ type: 'citext', unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @ApiProperty({ example: 'Jean' })
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @ApiProperty({ example: '+33612345678', required: false })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;

  @ApiProperty({ required: false })
  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refreshTokens: RefreshToken[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
