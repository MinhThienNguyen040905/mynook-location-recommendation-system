import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction } from '@mynook/database';

export interface RecentlyViewedVenue {
  venue_id: string;
  viewed_at: string;
  name: string;
  branch_name: string | null;
  address_line: string | null;
  ward: string | null;
  city_name: string | null;
  district_name: string | null;
  latitude: number;
  longitude: number;
  media: string[];
  rating_avg: number;
  review_count: number;
  current_crowd_level: string;
  primary_category_id: string | null;
  primary_category_key: string | null;
  primary_category_name: string | null;
}

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    @InjectRepository(UserInteraction)
    private readonly interactionRepo: Repository<UserInteraction>,
  ) {}

  /**
   * Track a venue view. Upserts on the partial unique index from migration 011
   * so each (account_id, venue_id, 'view') keeps a single row whose `created_at`
   * always reflects the latest view. Without this, a user spamming F5 would
   * grow the table without bound.
   */
  async trackView(accountId: string, venueId: string): Promise<void> {
    await this.interactionRepo.manager.query(
      `
      INSERT INTO interaction_schema.user_interactions
        (account_id, venue_id, interaction_type, time_spent_seconds, created_at)
      VALUES ($1, $2, 'view', 0, NOW())
      ON CONFLICT (account_id, venue_id, interaction_type)
        WHERE interaction_type IS NOT NULL
        DO UPDATE SET created_at = NOW()
      `,
      [accountId, venueId],
    );
  }

  /**
   * Most-recent venues this user opened. Cross-schema JOIN to venue_schema.
   * Filters out inactive venues so we don't surface deleted/banned ones.
   */
  async recentlyViewed(
    accountId: string,
    limit = 8,
  ): Promise<RecentlyViewedVenue[]> {
    const safeLimit = Math.max(1, Math.min(limit, 30));

    const rows = await this.interactionRepo.manager.query(
      `
      WITH latest AS (
        SELECT venue_id, MAX(created_at) AS viewed_at
        FROM interaction_schema.user_interactions
        WHERE account_id = $1 AND interaction_type = 'view'
        GROUP BY venue_id
      )
      SELECT
        l.venue_id,
        l.viewed_at,
        v.name,
        v.branch_name,
        v.address_line,
        v.ward,
        v.latitude,
        v.longitude,
        v.media,
        v.rating_avg,
        v.review_count,
        v.current_crowd_level,
        c.name AS city_name,
        d.name AS district_name,
        pc.id  AS primary_category_id,
        pc.key AS primary_category_key,
        pc.display_name AS primary_category_name
      FROM latest l
      JOIN venue_schema.venues v ON v.id = l.venue_id AND v.is_active = true
      LEFT JOIN venue_schema.cities c ON c.id = v.city_id
      LEFT JOIN venue_schema.districts d ON d.id = v.district_id
      LEFT JOIN LATERAL (
        SELECT cat.id, cat.key, cat.display_name
        FROM venue_schema.venue_categories vc
        JOIN venue_schema.categories cat ON cat.id = vc.category_id
        WHERE vc.venue_id = v.id AND vc.is_primary = true
        LIMIT 1
      ) pc ON true
      ORDER BY l.viewed_at DESC
      LIMIT $2
      `,
      [accountId, safeLimit],
    );

    return rows.map((r: Record<string, unknown>) => ({
      venue_id: r.venue_id as string,
      viewed_at: (r.viewed_at as Date).toISOString(),
      name: r.name as string,
      branch_name: r.branch_name as string | null,
      address_line: r.address_line as string | null,
      ward: r.ward as string | null,
      city_name: r.city_name as string | null,
      district_name: r.district_name as string | null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      media: (r.media as string[]) ?? [],
      rating_avg: Number(r.rating_avg ?? 0),
      review_count: Number(r.review_count ?? 0),
      current_crowd_level: r.current_crowd_level as string,
      primary_category_id: r.primary_category_id as string | null,
      primary_category_key: r.primary_category_key as string | null,
      primary_category_name: r.primary_category_name as string | null,
    }));
  }
}
