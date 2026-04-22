import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../database/entities/base.entity';
import { ProductType } from '../enums/product.enums';

@Entity({ name: 'product_categories' })
@Index('idx_categories_slug', ['slug'], { unique: true })
export class Category extends BaseEntity {
  @ApiProperty({ example: 'Imprimantes & Scanners' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ example: 'imprimantes-scanners' })
  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ProductType, required: false })
  @Column({
    type: 'enum',
    enum: ProductType,
    nullable: true,
    comment: 'Restreint aux produits de ce type (null = tous)',
  })
  productType?: ProductType;

  @ApiProperty({ required: false })
  @Column({ name: 'icon_url', type: 'varchar', length: 300, nullable: true })
  iconUrl?: string;

  @ApiProperty({ default: 0 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Category, (c) => c.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (c) => c.parent)
  children: Category[];
}
