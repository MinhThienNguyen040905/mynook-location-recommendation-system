import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

export interface InteractionStats {
  viewed_count: number;
}

export interface VenueInteractionAnalytics {
  venue: {
    id: string;
    name: string;
    branch_name: string | null;
    rating_avg: number;
    review_count: number;
  };
  summary: {
    unique_viewers: number;
    viewers_last_7d: number;
    favorites_count: number;
    reviews_count: number;
    average_rating: number;
    verified_reviews_count: number;
    review_likes: number;
    review_dislikes: number;
    review_comments: number;
    pending_reports: number;
    total_reports: number;
  };
  rating_distribution: Array<{ rating: number; count: number }>;
  recent_reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    created_at: string;
    author_name: string | null;
    like_count: number;
    dislike_count: number;
    comment_count: number;
  }>;
}

@Injectable()
export class InteractionsService {
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

  async stats(accountId: string): Promise<InteractionStats> {
    const rows = await this.interactionRepo.manager.query(
      `
      SELECT COUNT(DISTINCT venue_id)::int AS viewed_count
      FROM interaction_schema.user_interactions
      WHERE account_id = $1 AND interaction_type = 'view'
      `,
      [accountId],
    );

    return {
      viewed_count: Number(rows[0]?.viewed_count ?? 0),
    };
  }

  async venueAnalytics(
    accountId: string,
    venueId: string,
  ): Promise<VenueInteractionAnalytics> {
    const venueRows = await this.interactionRepo.manager.query(
      `
      SELECT id, owner_id, name, branch_name, rating_avg, review_count
      FROM venue_schema.venues
      WHERE id = $1
      LIMIT 1
      `,
      [venueId],
    );

    const venue = venueRows[0] as
      | {
          id: string;
          owner_id: string | null;
          name: string;
          branch_name: string | null;
          rating_avg: number | string | null;
          review_count: number | string | null;
        }
      | undefined;

    if (!venue) throw new NotFoundException('Venue not found');
    if (venue.owner_id !== accountId) {
      throw new ForbiddenException('You can only view analytics for your own venues');
    }

    const [
      viewRows,
      favoriteRows,
      reviewRows,
      reactionRows,
      commentRows,
      reportRows,
      ratingRows,
      recentReviewRows,
    ] = await Promise.all([
      this.interactionRepo.manager.query(
        `
        SELECT
          COUNT(DISTINCT account_id)::int AS unique_viewers,
          COUNT(DISTINCT account_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS viewers_last_7d
        FROM interaction_schema.user_interactions
        WHERE venue_id = $1 AND interaction_type = 'view'
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT COUNT(*)::int AS favorites_count
        FROM interaction_schema.user_favorites
        WHERE venue_id = $1
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT
          COUNT(*)::int AS reviews_count,
          COALESCE(AVG(rating), 0)::float AS average_rating,
          COUNT(*) FILTER (WHERE is_verified_visit = true)::int AS verified_reviews_count
        FROM interaction_schema.reviews
        WHERE venue_id = $1
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE rr.reaction_type = 'like')::int AS review_likes,
          COUNT(*) FILTER (WHERE rr.reaction_type = 'dislike')::int AS review_dislikes
        FROM interaction_schema.review_reactions rr
        JOIN interaction_schema.reviews r ON r.id = rr.review_id
        WHERE r.venue_id = $1
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT COUNT(*)::int AS review_comments
        FROM interaction_schema.review_comments c
        JOIN interaction_schema.reviews r ON r.id = c.review_id
        WHERE r.venue_id = $1
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT
          COUNT(*)::int AS total_reports,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_reports
        FROM interaction_schema.venue_reports
        WHERE venue_id = $1
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT rating::int AS rating, COUNT(*)::int AS count
        FROM interaction_schema.reviews
        WHERE venue_id = $1
        GROUP BY rating
        `,
        [venueId],
      ),
      this.interactionRepo.manager.query(
        `
        SELECT
          r.id,
          r.rating,
          r.content,
          r.created_at,
          COALESCE(NULLIF(TRIM(a.full_name), ''), split_part(a.email, '@', 1)) AS author_name,
          COALESCE(reactions.like_count, 0)::int AS like_count,
          COALESCE(reactions.dislike_count, 0)::int AS dislike_count,
          COALESCE(comments.comment_count, 0)::int AS comment_count
        FROM interaction_schema.reviews r
        LEFT JOIN auth_schema.accounts a ON a.id = r.account_id
        LEFT JOIN (
          SELECT
            review_id,
            COUNT(*) FILTER (WHERE reaction_type = 'like') AS like_count,
            COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislike_count
          FROM interaction_schema.review_reactions
          GROUP BY review_id
        ) reactions ON reactions.review_id = r.id
        LEFT JOIN (
          SELECT review_id, COUNT(*) AS comment_count
          FROM interaction_schema.review_comments
          GROUP BY review_id
        ) comments ON comments.review_id = r.id
        WHERE r.venue_id = $1
        ORDER BY r.created_at DESC
        LIMIT 5
        `,
        [venueId],
      ),
    ]);

    const viewStats = viewRows[0] as Record<string, unknown> | undefined;
    const favoriteStats = favoriteRows[0] as Record<string, unknown> | undefined;
    const reviewStats = reviewRows[0] as Record<string, unknown> | undefined;
    const reactionStats = reactionRows[0] as Record<string, unknown> | undefined;
    const commentStats = commentRows[0] as Record<string, unknown> | undefined;
    const reportStats = reportRows[0] as Record<string, unknown> | undefined;
    const ratingsByValue = new Map<number, number>(
      (ratingRows as Array<Record<string, unknown>>).map((row) => [
        Number(row['rating']),
        Number(row['count'] ?? 0),
      ]),
    );

    return {
      venue: {
        id: venue.id,
        name: venue.name,
        branch_name: venue.branch_name,
        rating_avg: Number(venue.rating_avg ?? 0),
        review_count: Number(venue.review_count ?? 0),
      },
      summary: {
        unique_viewers: Number(viewStats?.['unique_viewers'] ?? 0),
        viewers_last_7d: Number(viewStats?.['viewers_last_7d'] ?? 0),
        favorites_count: Number(favoriteStats?.['favorites_count'] ?? 0),
        reviews_count: Number(reviewStats?.['reviews_count'] ?? 0),
        average_rating: Number(reviewStats?.['average_rating'] ?? 0),
        verified_reviews_count: Number(reviewStats?.['verified_reviews_count'] ?? 0),
        review_likes: Number(reactionStats?.['review_likes'] ?? 0),
        review_dislikes: Number(reactionStats?.['review_dislikes'] ?? 0),
        review_comments: Number(commentStats?.['review_comments'] ?? 0),
        pending_reports: Number(reportStats?.['pending_reports'] ?? 0),
        total_reports: Number(reportStats?.['total_reports'] ?? 0),
      },
      rating_distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: ratingsByValue.get(rating) ?? 0,
      })),
      recent_reviews: (recentReviewRows as Array<Record<string, unknown>>).map((row) => ({
        id: row['id'] as string,
        rating: Number(row['rating'] ?? 0),
        content: (row['content'] as string | null) ?? null,
        created_at: new Date(row['created_at'] as string | Date).toISOString(),
        author_name: (row['author_name'] as string | null) ?? null,
        like_count: Number(row['like_count'] ?? 0),
        dislike_count: Number(row['dislike_count'] ?? 0),
        comment_count: Number(row['comment_count'] ?? 0),
      })),
    };
  }
}
