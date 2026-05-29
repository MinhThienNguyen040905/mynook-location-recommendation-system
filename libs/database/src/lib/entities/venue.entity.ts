import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
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

  // --- Address (normalized via migration 008) ---

  /** Street-level address only, e.g. "123 Lê Lợi" */
  @Column({ type: 'varchar', length: 255, nullable: true })
  address_line!: string | null;

  /** Optional ward/phường, e.g. "Phường Bến Nghé" */
  @Column({ type: 'varchar', length: 100, nullable: true })
  ward!: string | null;

  @Column({ type: 'uuid', nullable: true })
  district_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  city_id!: string | null;

  @ManyToOne(() => District, { nullable: true })
  @JoinColumn({ name: 'district_id' })
  district_ref?: District | null;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city_ref?: City | null;

  @Column({ type: 'float' })
  latitude!: number;

  @Column({ type: 'float' })
  longitude!: number;

  /**
   * PostGIS `geography(Point, 4326)` generated from (longitude, latitude).
   * Read-only from TypeORM's perspective — set `insert: false, update: false`
   * because the DB computes it.
   */
  @Column({ type: 'text', nullable: true, insert: false, update: false, select: false })
  location!: string | null;

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

  @OneToMany(() => VenueCategory, (vc) => vc.venue)
  venue_categories?: VenueCategory[];
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

// ── Venue category taxonomy ──────────────────────────────────────
// Master list of venue types (cafe, restaurant, hotpot, ...) used by
// the AI-powered search to filter/rank results. See migration 007.

@Entity({ schema: 'venue_schema', name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Stable key used by AI + API (snake_case, English) */
  @Column({ type: 'varchar', length: 50, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 100 })
  display_name!: string;

  /** Synonyms in VN/EN used to help Groq map free-text queries to this category */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  synonyms!: string[];

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @OneToMany(() => VenueCategory, (vc) => vc.category)
  venue_categories?: VenueCategory[];
}

@Entity({ schema: 'venue_schema', name: 'venue_categories' })
@Unique('uq_venue_category', ['venue_id', 'category_id'])
export class VenueCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'uuid' })
  category_id!: string;

  /** Primary category shown on cards; partial unique index enforces 1/venue */
  @Column({ type: 'boolean', default: false })
  is_primary!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Venue, (v) => v.venue_categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue?: Venue;

  @ManyToOne(() => Category, (c) => c.venue_categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;
}

// ── Location taxonomy (migration 008) ────────────────────────────
// Reference tables for cities / districts with alias arrays for AI
// query mapping ("Q1" → Quận 1). PostGIS centroid supports distance
// ranking. search-ai-service reads; venue-service owns CRUD.

@Entity({ schema: 'venue_schema', name: 'cities' })
export class City {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short code used by AI/API (e.g. 'HCM', 'HN') */
  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Normalized lower-case aliases — used to resolve free-text location input */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  aliases!: string[];

  /** PostGIS centroid; stored as text by TypeORM, written by the DB */
  @Column({ type: 'text', nullable: true, select: false })
  centroid!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @OneToMany(() => District, (d) => d.city)
  districts?: District[];
}

@Entity({ schema: 'venue_schema', name: 'districts' })
@Unique('uq_district_city_code', ['city_id', 'code'])
export class District {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  city_id!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  aliases!: string[];

  @Column({ type: 'text', nullable: true, select: false })
  centroid!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => City, (c) => c.districts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city?: City;
}
