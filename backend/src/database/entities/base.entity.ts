import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entité de base héritée par toutes les entités du système.
 * Fournit : id (UUID), timestamps, soft delete, versioning optimiste.
 */
export abstract class BaseEntity {
  @ApiProperty({
    description: 'Identifiant unique (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Date de création' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière mise à jour' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date de suppression (soft delete)',
    required: false,
  })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt?: Date;

  @ApiProperty({ description: 'Version (verrouillage optimiste)' })
  @VersionColumn({ default: 1 })
  version: number;
}
