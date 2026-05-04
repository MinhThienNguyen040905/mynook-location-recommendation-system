import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '@mynook/database';

export interface RecommendedVenue {
  id: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  address_line: string | null;
  ward: string | null;
  city_id: string | null;
  district_id: string | null;
  latitude: number;
  longitude: number;
  media: string[];
  rating_avg: number;
  review_count: number;
  current_crowd_level: string;
  is_community_contributed: boolean;
  is_active: boolean;
  city_name: string | null;
  district_name: string | null;
  primary_category_id: string | null;
  primary_category_key: string | null;
  primary_category_name: string | null;
  /** Cosine similarity to user's taste vector. 1 = perfect match, 0 = orthogonal. */
  similarity: number;
}

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  /**
   * Recommendation strategy:
   *  1. Build a "taste vector" = average embedding of venues the user has either
   *     favorited or rated >= 4 stars.
   *  2. kNN against `venues.embedding` (pgvector cosine) excluding venues the user
   *     has already interacted with (favorited/reviewed).
   *  3. If the user has no signals yet, return [] — the FE knows to fall back to
   *     a generic list.
   */
  async recommendForUser(
    accountId: string,
    limit = 6,
  ): Promise<RecommendedVenue[]> {
    const safeLimit = Math.max(1, Math.min(limit, 30));

    // Collect seed venue ids (favorites + own positive reviews) and venues
    // we should exclude from results (any past interaction).
    // Filter `v.is_active = true` so soft-deleted venues' embeddings don't
    // pollute the taste-vector centroid.
    const seedRows = await this.venueRepo.manager.query(
      `
      SELECT seeds.venue_id, seeds.kind FROM (
        SELECT venue_id, 'favorite'::text AS kind, created_at
        FROM interaction_schema.user_favorites
        WHERE account_id = $1
        UNION ALL
        SELECT venue_id, 'review'::text AS kind, created_at
        FROM interaction_schema.reviews
        WHERE account_id = $1 AND rating >= 4
      ) seeds
      JOIN venue_schema.venues v ON v.id = seeds.venue_id
      WHERE v.is_active = true
      ORDER BY seeds.created_at DESC
      LIMIT 50
      `,
      [accountId],
    );

    if (seedRows.length === 0) return [];

    const seedIds = Array.from(
      new Set(seedRows.map((r: { venue_id: string }) => r.venue_id)),
    );

    // Also exclude *any* venue the user has touched (low-rating reviews too)
    // so we don't recommend something they already disliked or saw.
    const excludeRows = await this.venueRepo.manager.query(
      `
      SELECT DISTINCT venue_id FROM (
        SELECT venue_id FROM interaction_schema.user_favorites WHERE account_id = $1
        UNION
        SELECT venue_id FROM interaction_schema.reviews WHERE account_id = $1
      ) t
      `,
      [accountId],
    );
    const excludeIds = excludeRows.map((r: { venue_id: string }) => r.venue_id);

    // Compute taste vector & kNN in a single SQL pass — pgvector handles AVG(vector).
    // The taste vector is the mean of seed venues' embeddings (NULL embeddings skipped).
    const rows = await this.venueRepo.manager.query(
      `
      WITH taste AS (
        SELECT AVG(embedding)::vector AS vec
        FROM venue_schema.venues
        WHERE id = ANY($1::uuid[]) AND embedding IS NOT NULL
      )
      SELECT
        v.id,
        v.name,
        v.branch_name,
        v.description,
        v.address_line,
        v.ward,
        v.city_id,
        v.district_id,
        v.latitude,
        v.longitude,
        v.media,
        v.rating_avg,
        v.review_count,
        v.current_crowd_level,
        v.is_community_contributed,
        v.is_active,
        c.name AS city_name,
        d.name AS district_name,
        pc.id  AS primary_category_id,
        pc.key AS primary_category_key,
        pc.display_name AS primary_category_name,
        1 - LEAST(v.embedding <=> taste.vec, 1.0) AS similarity
      FROM venue_schema.venues v
      CROSS JOIN taste
      LEFT JOIN venue_schema.cities c ON c.id = v.city_id
      LEFT JOIN venue_schema.districts d ON d.id = v.district_id
      LEFT JOIN LATERAL (
        SELECT cat.id, cat.key, cat.display_name
        FROM venue_schema.venue_categories vc
        JOIN venue_schema.categories cat ON cat.id = vc.category_id
        WHERE vc.venue_id = v.id AND vc.is_primary = true
        LIMIT 1
      ) pc ON true
      WHERE v.is_active = true
        AND v.embedding IS NOT NULL
        AND taste.vec IS NOT NULL
        AND v.id <> ALL($2::uuid[])
        AND v.current_crowd_level != 'full'
      ORDER BY v.embedding <=> taste.vec ASC,
               v.rating_avg DESC
      LIMIT $3
      `,
      [seedIds, excludeIds, safeLimit],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      branch_name: r.branch_name as string | null,
      description: r.description as string | null,
      address_line: r.address_line as string | null,
      ward: r.ward as string | null,
      city_id: r.city_id as string | null,
      district_id: r.district_id as string | null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      media: (r.media as string[]) ?? [],
      rating_avg: Number(r.rating_avg ?? 0),
      review_count: Number(r.review_count ?? 0),
      current_crowd_level: r.current_crowd_level as string,
      is_community_contributed: r.is_community_contributed === true,
      is_active: r.is_active === true,
      city_name: r.city_name as string | null,
      district_name: r.district_name as string | null,
      primary_category_id: r.primary_category_id as string | null,
      primary_category_key: r.primary_category_key as string | null,
      primary_category_name: r.primary_category_name as string | null,
      similarity: Number(r.similarity ?? 0),
    }));
  }
}
