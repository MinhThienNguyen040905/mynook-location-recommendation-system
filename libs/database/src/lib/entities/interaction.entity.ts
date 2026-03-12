import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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
  user_id!: string;

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
  user_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  venue_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ schema: 'interaction_schema', name: 'user_interactions' })
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  interaction_type!: string | null;

  @Column({ type: 'int', default: 0 })
  time_spent_seconds!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ schema: 'interaction_schema', name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

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
