import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum NotificationType {
  REVIEW_REPLY = 'review_reply',
  PROMO = 'promo',
  SYSTEM = 'system',
  REMINDER = 'reminder',
}

@Entity({ schema: 'interaction_schema', name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  account_id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'jsonb', default: '[]' })
  media!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  ai_analysis_json!: unknown | null;

  @Column({ type: 'boolean', default: false })
  is_verified_visit!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ schema: 'interaction_schema', name: 'user_favorites' })
export class UserFavorite {
  @PrimaryColumn({ type: 'uuid' })
  account_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  venue_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ schema: 'interaction_schema', name: 'user_interactions' })
// Migration 011 enforces uniqueness on (account_id, venue_id, interaction_type)
// so trackView() can UPSERT instead of INSERT, keeping the table bounded.
@Index('uniq_user_interactions_per_type', ['account_id', 'venue_id', 'interaction_type'], {
  unique: true,
  where: '"interaction_type" IS NOT NULL',
})
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  account_id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  interaction_type!: string | null;

  @Column({ type: 'int', default: 0 })
  time_spent_seconds!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED_DELETED = 'resolved_deleted',
  DISMISSED = 'dismissed',
}

@Entity({ schema: 'interaction_schema', name: 'review_reports' })
export class ReviewReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  review_id!: string;

  @Column({ type: 'uuid' })
  reporter_account_id!: string;

  @Column({ type: 'varchar', length: 100 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  resolved_by!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

export enum VenueReportStatus {
  PENDING = 'pending',
  RESOLVED_DEACTIVATED = 'resolved_deactivated',
  DISMISSED = 'dismissed',
}

@Entity({ schema: 'interaction_schema', name: 'venue_reports' })
export class VenueReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'uuid' })
  reporter_account_id!: string;

  @Column({ type: 'varchar', length: 100 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: VenueReportStatus,
    default: VenueReportStatus.PENDING,
  })
  status!: VenueReportStatus;

  @Column({ type: 'uuid', nullable: true })
  resolved_by!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ schema: 'interaction_schema', name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  account_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type!: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  related_entity_id!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  related_entity_type!: string | null;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
