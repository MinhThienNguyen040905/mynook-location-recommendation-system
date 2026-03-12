import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

export enum TimeContext {
  ALL_DAY = 'all_day',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

@Entity({ schema: 'search_schema', name: 'tags' })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 100 })
  display_name!: string;

  @Column({ type: 'text', nullable: true })
  icon_url!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;
}

@Entity({ schema: 'search_schema', name: 'venue_tags' })
@Unique(['venue_id', 'tag_id', 'time_frame'])
export class VenueTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'uuid' })
  tag_id!: string;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  positive_count!: number;

  @Column({ type: 'int', default: 0 })
  negative_count!: number;

  @Column({
    type: 'enum',
    enum: TimeContext,
    default: TimeContext.ALL_DAY,
  })
  time_frame!: TimeContext;
}

@Entity({ schema: 'search_schema', name: 'search_logs' })
export class SearchLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'text', nullable: true })
  search_query!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  filters_used!: unknown | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
