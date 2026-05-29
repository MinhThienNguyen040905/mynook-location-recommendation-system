import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venue } from './venue.entity.js';

export enum VenueImportStatus {
  DRAFT = 'draft',
  ENRICHED = 'enriched',
  READY = 'ready',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
}

@Entity({ schema: 'venue_schema', name: 'venue_imports' })
export class VenueImport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: 'google_maps' })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_place_id!: string | null;

  @Column({ type: 'text', nullable: true })
  source_url!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  raw_payload!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  normalized_payload!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: VenueImportStatus,
    default: VenueImportStatus.DRAFT,
  })
  status!: VenueImportStatus;

  @Column({ type: 'uuid', nullable: true })
  matched_venue_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  published_venue_id!: string | null;

  @Column({ type: 'float', default: 0 })
  confidence!: number;

  @Column({ type: 'uuid' })
  created_by!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn({ name: 'matched_venue_id' })
  matched_venue?: Venue | null;

  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn({ name: 'published_venue_id' })
  published_venue?: Venue | null;
}

@Entity({ schema: 'venue_schema', name: 'venue_import_review_sources' })
export class VenueImportReviewSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venue_import_id!: string;

  @Column({ type: 'uuid' })
  review_id!: string;

  @Column({ type: 'varchar', length: 50, default: 'google_maps' })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_review_id!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  raw_payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
