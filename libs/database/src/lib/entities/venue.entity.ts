import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum CrowdLevel {
  EMPTY = 'empty',
  MODERATE = 'moderate',
  CROWDED = 'crowded',
  FULL = 'full',
}

@Entity({ schema: 'venue_schema', name: 'venues' })
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  owner_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branch_name!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 100, default: 'Ho Chi Minh' })
  city!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({ type: 'float' })
  latitude!: number;

  @Column({ type: 'float' })
  longitude!: number;

  @Column({ type: 'jsonb', default: '[]' })
  media!: unknown[];

  @Column({ type: 'int', default: 50 })
  total_capacity!: number;

  @Column({ type: 'int', default: 10 })
  max_group_size!: number;

  @Column({ type: 'boolean', default: false })
  is_group_friendly!: boolean;

  @Column({
    type: 'enum',
    enum: CrowdLevel,
    default: CrowdLevel.MODERATE,
  })
  current_crowd_level!: CrowdLevel;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  opening_hours!: unknown | null;

  @Column({ type: 'text', nullable: true })
  menu_image_url!: string | null;

  @Column({ type: 'float', default: 0 })
  rating_avg!: number;

  @Column({ type: 'int', default: 0 })
  review_count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  // --- Community contribution ---

  /** True if this venue was contributed by a regular user (not the owner) */
  @Column({ type: 'boolean', default: false })
  is_community_contributed!: boolean;

  /** Account ID of the user who contributed this venue (null if created by owner) */
  @Column({ type: 'uuid', nullable: true })
  contributed_by!: string | null;

  // --- Hybrid Search columns ---

  /** Pre-built text document for full-text / embedding generation */
  @Column({ type: 'text', nullable: true })
  search_document!: string | null;

  /**
   * 384-dimension vector embedding (all-MiniLM-L6-v2).
   * Stored as pgvector `vector(384)`.
   * TypeORM maps it as a plain string; pgvector handles casting.
   */
  @Column({ type: 'text', nullable: true })
  embedding!: string | null;

  @OneToMany(() => MenuCategory, (cat) => cat.venue)
  menu_categories?: MenuCategory[];
}

@Entity({ schema: 'venue_schema', name: 'menu_categories' })
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @ManyToOne(() => Venue, (v) => v.menu_categories)
  @JoinColumn({ name: 'venue_id' })
  venue?: Venue;

  @OneToMany(() => MenuItem, (item) => item.category)
  items?: MenuItem[];
}

@Entity({ schema: 'venue_schema', name: 'menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  category_id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  @Column({ type: 'boolean', default: true })
  is_available!: boolean;

  @ManyToOne(() => MenuCategory, (cat) => cat.items)
  @JoinColumn({ name: 'category_id' })
  category?: MenuCategory;
}
