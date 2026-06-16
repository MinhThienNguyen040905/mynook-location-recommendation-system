import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import {
  NotificationType,
  Review,
  ReviewComment,
  ReviewReaction,
} from '@mynook/database';
import { RMQ_EVENTS, VenueReviewDeletedEvent } from '@mynook/shared-types';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { NotificationService } from '../notification/notification.service.js';

interface SeedGoogleMapsReviewInput {
  source_review_id?: string | null;
  author_name?: string | null;
  rating: number;
  content: string;
  published_at?: string | null;
  media?: string[] | null;
}

interface SeedGoogleMapsReviewsDto {
  venue_id: string;
  reviews: SeedGoogleMapsReviewInput[];
}

export interface UserReviewListItem {
  id: string;
  account_id: string;
  venue_id: string;
  content: string | null;
  rating: number;
  media: string[];
  ai_analysis_json: unknown | null;
  is_verified_visit: boolean;
  created_at: string;
  venue: {
    id: string;
    name: string;
    branch_name: string | null;
    address_line: string | null;
    ward: string | null;
    city_name: string | null;
    district_name: string | null;
    media: string[];
    rating_avg: number;
    review_count: number;
  } | null;
}

export interface UserReviewListResponse {
  total: number;
  data: UserReviewListItem[];
}

type ReviewReactionType = 'like' | 'dislike';

export interface ReviewCommentView {
  id: string;
  review_id: string;
  account_id: string;
  parent_comment_id: string | null;
  content: string;
  media: string[];
  created_at: string;
  author: {
    id: string;
    display_name: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  replies: ReviewCommentView[];
}

export interface VenueReviewView {
  id: string;
  account_id: string;
  venue_id: string;
  content: string | null;
  rating: number;
  media: string[];
  ai_analysis_json: unknown | null;
  is_verified_visit: boolean;
  created_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  my_reaction: ReviewReactionType | null;
  comments: ReviewCommentView[];
  author: {
    id: string;
    display_name: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ReviewReactionSummary {
  review_id: string;
  like_count: number;
  dislike_count: number;
  my_reaction: ReviewReactionType | null;
}

@Injectable()
export class ReviewService implements OnModuleInit {
  private readonly logger = new Logger(ReviewService.name);
  private rmqConnected = false;

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(ReviewComment)
    private readonly commentRepo: Repository<ReviewComment>,
    @InjectRepository(ReviewReaction)
    private readonly reactionRepo: Repository<ReviewReaction>,
    @Inject('EVENTS_SERVICE')
    private readonly events: ClientProxy,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.ensureRmqConnected();
  }

  private async ensureRmqConnected(): Promise<boolean> {
    if (this.rmqConnected) return true;

    try {
      await this.events.connect();
      this.rmqConnected = true;
      this.logger.log('Connected to RabbitMQ (EVENTS_SERVICE)');
      return true;
    } catch (err) {
      this.logger.warn(
        `RabbitMQ not available: ${(err as Error).message}. Review events will be skipped.`,
      );
      return false;
    }
  }

  /** Lấy danh sách reviews của một venue (mới nhất trước), kèm thông tin người viết */
  async findByVenue(
    venueId: string,
    accountId?: string | null,
  ): Promise<VenueReviewView[]> {
    const rows = await this.reviewRepo.manager.query(
      `
      SELECT r.id,
             r.account_id,
             r.venue_id,
             r.content,
             r.rating,
             r.media,
             r.ai_analysis_json,
             r.is_verified_visit,
             r.created_at,
             COALESCE(reactions.like_count, 0)::int AS like_count,
             COALESCE(reactions.dislike_count, 0)::int AS dislike_count,
             COALESCE(comments.comment_count, 0)::int AS comment_count,
             my_reaction.reaction_type AS my_reaction,
             a.id           AS author_id,
             a.full_name    AS author_full_name,
             a.avatar_url   AS author_avatar_url,
             COALESCE(
               NULLIF(TRIM(a.full_name), ''),
               NULLIF(split_part(a.email, '@', 1), ''),
               'Người dùng'
              )              AS author_display_name
        FROM interaction_schema.reviews r
        LEFT JOIN auth_schema.accounts a ON a.id = r.account_id
        LEFT JOIN (
          SELECT review_id,
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
        LEFT JOIN interaction_schema.review_reactions my_reaction
          ON my_reaction.review_id = r.id
         AND my_reaction.account_id = $2
       WHERE r.venue_id = $1
       ORDER BY CASE WHEN r.account_id = $2 THEN 0 ELSE 1 END,
                r.created_at DESC
      `,
      [venueId, accountId ?? null],
    );

    const reviewIds = rows.map((row: Record<string, unknown>) => row['id'] as string);
    const commentsByReview = await this.getCommentsByReview(reviewIds);

    return rows.map((row: Record<string, unknown>) => ({
      id: row['id'] as string,
      account_id: row['account_id'] as string,
      venue_id: row['venue_id'] as string,
      content: (row['content'] as string | null) ?? null,
      rating: Number(row['rating']),
      media: this.normalizeMedia(row['media']),
      ai_analysis_json: row['ai_analysis_json'] ?? null,
      is_verified_visit: row['is_verified_visit'] === true,
      created_at: new Date(row['created_at'] as string | Date).toISOString(),
      like_count: Number(row['like_count'] ?? 0),
      dislike_count: Number(row['dislike_count'] ?? 0),
      comment_count: Number(row['comment_count'] ?? 0),
      my_reaction:
        row['my_reaction'] === 'like' || row['my_reaction'] === 'dislike'
          ? row['my_reaction']
          : null,
      comments: commentsByReview.get(row['id'] as string) ?? [],
      author: row['author_id']
        ? {
            id: row['author_id'] as string,
            display_name: (row['author_display_name'] as string) ?? 'Người dùng',
            full_name: (row['author_full_name'] as string | null) ?? null,
            avatar_url: (row['author_avatar_url'] as string | null) ?? null,
          }
        : null,
    }));
  }

  /** Lấy reviews của một user, kèm thông tin venue để hiển thị ở profile. */
  async findByAccount(
    accountId: string,
    limit = 20,
  ): Promise<UserReviewListResponse> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const [countRows, rows] = await Promise.all([
      this.reviewRepo.manager.query(
        `
        SELECT COUNT(*)::int AS total
        FROM interaction_schema.reviews
        WHERE account_id = $1
        `,
        [accountId],
      ),
      this.reviewRepo.manager.query(
        `
        SELECT
          r.id,
          r.account_id,
          r.venue_id,
          r.content,
          r.rating,
          r.media,
          r.ai_analysis_json,
          r.is_verified_visit,
          r.created_at,
          v.id AS venue_id_ref,
          v.name AS venue_name,
          v.branch_name AS venue_branch_name,
          v.address_line AS venue_address_line,
          v.ward AS venue_ward,
          v.media AS venue_media,
          v.rating_avg AS venue_rating_avg,
          v.review_count AS venue_review_count,
          c.name AS venue_city_name,
          d.name AS venue_district_name
        FROM interaction_schema.reviews r
        LEFT JOIN venue_schema.venues v ON v.id = r.venue_id
        LEFT JOIN venue_schema.cities c ON c.id = v.city_id
        LEFT JOIN venue_schema.districts d ON d.id = v.district_id
        WHERE r.account_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2
        `,
        [accountId, safeLimit],
      ),
    ]);

    return {
      total: Number(countRows[0]?.total ?? 0),
      data: rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        account_id: row.account_id as string,
        venue_id: row.venue_id as string,
        content: row.content as string | null,
        rating: Number(row.rating),
        media: this.normalizeMedia(row.media),
        ai_analysis_json: row.ai_analysis_json ?? null,
        is_verified_visit: row.is_verified_visit === true,
        created_at: new Date(row.created_at as string | Date).toISOString(),
        venue: row.venue_id_ref
          ? {
              id: row.venue_id_ref as string,
              name: row.venue_name as string,
              branch_name: row.venue_branch_name as string | null,
              address_line: row.venue_address_line as string | null,
              ward: row.venue_ward as string | null,
              city_name: row.venue_city_name as string | null,
              district_name: row.venue_district_name as string | null,
              media: this.normalizeMedia(row.venue_media),
              rating_avg: Number(row.venue_rating_avg ?? 0),
              review_count: Number(row.venue_review_count ?? 0),
            }
          : null,
      })),
    };
  }

  /** Tạo review mới + emit event để search-ai-service xử lý AI analysis */
  async create(accountId: string, dto: CreateReviewDto): Promise<Review> {
    return this.saveAndEmitReview({
      accountId,
      venueId: dto.venue_id,
      rating: dto.rating,
      content: dto.content ?? null,
      media: dto.media ?? [],
      isVerifiedVisit: false,
    });
  }

  async setReaction(
    accountId: string,
    reviewId: string,
    reaction: ReviewReactionType | null,
  ): Promise<ReviewReactionSummary> {
    await this.ensureReviewExists(reviewId);

    if (reaction === null) {
      await this.reactionRepo.delete({ review_id: reviewId, account_id: accountId });
      return this.getReactionSummary(reviewId, accountId);
    }

    if (reaction !== 'like' && reaction !== 'dislike') {
      throw new BadRequestException('reaction must be like, dislike, or null');
    }

    await this.reactionRepo.manager.query(
      `
      INSERT INTO interaction_schema.review_reactions
        (review_id, account_id, reaction_type, created_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (review_id, account_id)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type,
                    created_at = now()
      `,
      [reviewId, accountId, reaction],
    );

    return this.getReactionSummary(reviewId, accountId);
  }

  async createComment(
    accountId: string,
    reviewId: string,
    content: string,
    parentCommentId?: string | null,
    media?: unknown[] | null,
  ): Promise<ReviewCommentView> {
    await this.ensureReviewExists(reviewId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Comment content is required');
    }
    if (trimmed.length > 1000) {
      throw new BadRequestException('Comment content must be 1000 characters or fewer');
    }
    const safeMedia = this.normalizeMedia(media);

    if (parentCommentId) {
      const parentRows: Array<{ id: string }> = await this.commentRepo.manager.query(
        `
        SELECT id
        FROM interaction_schema.review_comments
        WHERE id = $1 AND review_id = $2
        `,
        [parentCommentId, reviewId],
      );
      if (parentRows.length === 0) {
        throw new BadRequestException('Parent comment does not belong to this review');
      }
    }

    const rows: Array<{ id: string }> = await this.commentRepo.manager.query(
      `
      INSERT INTO interaction_schema.review_comments
        (review_id, account_id, parent_comment_id, content, media, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, now())
      RETURNING id
      `,
      [reviewId, accountId, parentCommentId ?? null, trimmed, JSON.stringify(safeMedia)],
    );

    const comment = await this.getCommentById(rows[0].id);
    if (!comment) throw new NotFoundException('Comment not found after create');
    await this.notifyReviewComment({
      actorId: accountId,
      reviewId,
      parentCommentId: parentCommentId ?? null,
    });
    return comment;
  }

  async seedGoogleMapsReviews(dto: SeedGoogleMapsReviewsDto) {
    const reviews = dto.reviews.filter((review) => review.content.trim().length > 0);
    if (reviews.length === 0) {
      return { venue_id: dto.venue_id, reviews: [] as Array<Record<string, unknown>> };
    }

    const accounts = await this.pickSeedAccounts(reviews.length);
    const created: Array<Review & {
      source_review_id: string | null;
      author_name: string | null;
    }> = [];

    for (let index = 0; index < reviews.length; index++) {
      const review = reviews[index];
      const accountId = accounts[index % accounts.length];
      const reviewMedia = Array.isArray(review.media)
        ? review.media.filter((url): url is string => typeof url === 'string' && url.length > 0)
        : [];
      const saved = await this.saveAndEmitReview({
        accountId,
        venueId: dto.venue_id,
        rating: review.rating,
        content: review.content,
        media: reviewMedia,
        isVerifiedVisit: false,
        notifyOwner: false,
      });
      created.push({
        ...saved,
        source_review_id: review.source_review_id ?? null,
        author_name: review.author_name ?? null,
      });
    }

    return {
      venue_id: dto.venue_id,
      reviews: created,
    };
  }

  /** Update AI analysis JSON on a review (called by search-ai-service) */
  async updateAiAnalysis(
    reviewId: string,
    aiAnalysis: unknown,
  ): Promise<void> {
    await this.reviewRepo.update(reviewId, {
      ai_analysis_json: aiAnalysis as Record<string, unknown>,
    });
    this.logger.log(`Updated AI analysis for review ${reviewId}`);
  }

  /**
   * Delete a review and emit `venue.review.deleted` so search-ai-service can
   * reverse the venue_tag deltas it previously applied. Reads the review row
   * BEFORE deleting in order to capture the AI analysis snapshot.
   */
  async delete(reviewId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    if (await this.ensureRmqConnected()) {
      const analysis = (review.ai_analysis_json ?? null) as
        | VenueReviewDeletedEvent['analysis']
        | null;
      const payload: VenueReviewDeletedEvent = {
        reviewId: review.id,
        venueId: review.venue_id,
        rating: review.rating,
        isVerifiedVisit: review.is_verified_visit,
        analysis,
      };
      this.events.emit(RMQ_EVENTS.VENUE_REVIEW_DELETED, payload).subscribe({
        next: () =>
          this.logger.log(
            `Emitted ${RMQ_EVENTS.VENUE_REVIEW_DELETED} for review ${review.id}`,
          ),
        error: (err: Error) =>
          this.logger.warn(`Failed to emit review-deleted event: ${err.message}`),
      });
    } else {
      this.logger.warn(
        `Skipping venue.review.deleted event for review ${reviewId} - RMQ not connected`,
      );
    }

    await this.reviewRepo.delete(reviewId);
  }

  private async ensureReviewExists(reviewId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Review not found');
  }

  private async getReactionSummary(
    reviewId: string,
    accountId: string,
  ): Promise<ReviewReactionSummary> {
    const rows: Array<{
      like_count: string | number;
      dislike_count: string | number;
      my_reaction: ReviewReactionType | null;
    }> = await this.reactionRepo.manager.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE reaction_type = 'like') AS like_count,
        COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislike_count,
        (
          SELECT reaction_type
          FROM interaction_schema.review_reactions
          WHERE review_id = $1 AND account_id = $2
        ) AS my_reaction
      FROM interaction_schema.review_reactions
      WHERE review_id = $1
      `,
      [reviewId, accountId],
    );

    const row = rows[0];
    return {
      review_id: reviewId,
      like_count: Number(row?.like_count ?? 0),
      dislike_count: Number(row?.dislike_count ?? 0),
      my_reaction:
        row?.my_reaction === 'like' || row?.my_reaction === 'dislike'
          ? row.my_reaction
          : null,
    };
  }

  private async getCommentById(commentId: string): Promise<ReviewCommentView | null> {
    const rows = await this.commentRepo.manager.query(
      `
      SELECT c.id,
             c.review_id,
             c.account_id,
             c.parent_comment_id,
             c.content,
             c.media,
             c.created_at,
             a.id AS author_id,
             a.full_name AS author_full_name,
             a.avatar_url AS author_avatar_url,
             COALESCE(
               NULLIF(TRIM(a.full_name), ''),
               NULLIF(split_part(a.email, '@', 1), ''),
               'Người dùng'
             ) AS author_display_name
      FROM interaction_schema.review_comments c
      LEFT JOIN auth_schema.accounts a ON a.id = c.account_id
      WHERE c.id = $1
      `,
      [commentId],
    );

    return rows[0] ? this.mapCommentRow(rows[0] as Record<string, unknown>) : null;
  }

  private async getCommentsByReview(
    reviewIds: string[],
  ): Promise<Map<string, ReviewCommentView[]>> {
    const byReview = new Map<string, ReviewCommentView[]>();
    if (reviewIds.length === 0) return byReview;

    const rows: Array<Record<string, unknown>> = await this.commentRepo.manager.query(
      `
      SELECT c.id,
             c.review_id,
             c.account_id,
             c.parent_comment_id,
             c.content,
             c.media,
             c.created_at,
             a.id AS author_id,
             a.full_name AS author_full_name,
             a.avatar_url AS author_avatar_url,
             COALESCE(
               NULLIF(TRIM(a.full_name), ''),
               NULLIF(split_part(a.email, '@', 1), ''),
               'Người dùng'
             ) AS author_display_name
      FROM interaction_schema.review_comments c
      LEFT JOIN auth_schema.accounts a ON a.id = c.account_id
      WHERE c.review_id = ANY($1::uuid[])
      ORDER BY c.created_at ASC
      `,
      [reviewIds],
    );

    const byId = new Map<string, ReviewCommentView>();
    for (const row of rows) {
      const comment = this.mapCommentRow(row);
      byId.set(comment.id, comment);
    }

    for (const comment of byId.values()) {
      const parent = comment.parent_comment_id
        ? byId.get(comment.parent_comment_id)
        : null;
      if (parent) {
        parent.replies.push(comment);
      } else {
        const list = byReview.get(comment.review_id) ?? [];
        list.push(comment);
        byReview.set(comment.review_id, list);
      }
    }

    return byReview;
  }

  private mapCommentRow(row: Record<string, unknown>): ReviewCommentView {
    return {
      id: row['id'] as string,
      review_id: row['review_id'] as string,
      account_id: row['account_id'] as string,
      parent_comment_id: (row['parent_comment_id'] as string | null) ?? null,
      content: row['content'] as string,
      media: (row['media'] as string[]) ?? [],
      created_at: new Date(row['created_at'] as string | Date).toISOString(),
      author: row['author_id']
        ? {
            id: row['author_id'] as string,
            display_name: (row['author_display_name'] as string) ?? 'Người dùng',
            full_name: (row['author_full_name'] as string | null) ?? null,
            avatar_url: (row['author_avatar_url'] as string | null) ?? null,
          }
        : null,
      replies: [],
    };
  }

  private normalizeMedia(media: unknown): string[] {
    if (typeof media === 'string') {
      try {
        return this.normalizeMedia(JSON.parse(media));
      } catch {
        const trimmed = media.trim();
        return trimmed ? [trimmed] : [];
      }
    }

    if (!Array.isArray(media)) return [];
    return media
      .filter((url): url is string => typeof url === 'string')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .slice(0, 4);
  }

  private async saveAndEmitReview(input: {
    accountId: string;
    venueId: string;
    rating: number;
    content: string | null;
    media: unknown[];
    isVerifiedVisit: boolean;
    notifyOwner?: boolean;
  }): Promise<Review> {
    const review = this.reviewRepo.create({
      account_id: input.accountId,
      venue_id: input.venueId,
      rating: input.rating,
      content: input.content,
      media: this.normalizeMedia(input.media),
      is_verified_visit: input.isVerifiedVisit,
    });
    const saved = await this.reviewRepo.save(review);
    await this.emitVenueReviewed(saved);
    if (input.notifyOwner !== false) {
      await this.notifyVenueOwnerAboutReview(saved);
    }
    return saved;
  }

  private async notifyVenueOwnerAboutReview(review: Review): Promise<void> {
    const rows: Array<{
      owner_id: string | null;
      venue_name: string | null;
      author_display_name: string | null;
    }> = await this.reviewRepo.manager.query(
      `
      SELECT v.owner_id,
             v.name AS venue_name,
             COALESCE(
               NULLIF(TRIM(a.full_name), ''),
               NULLIF(split_part(a.email, '@', 1), ''),
               'Người dùng'
             ) AS author_display_name
      FROM venue_schema.venues v
      LEFT JOIN auth_schema.accounts a ON a.id = $2
      WHERE v.id = $1
      `,
      [review.venue_id, review.account_id],
    );

    const context = rows[0];
    if (!context?.owner_id || context.owner_id === review.account_id) return;

    await this.notificationService.createForAccount({
      accountId: context.owner_id,
      title: 'Venue của bạn có đánh giá mới',
      message: `${context.author_display_name ?? 'Người dùng'} đã đánh giá ${review.rating} sao cho ${context.venue_name ?? 'venue của bạn'}.`,
      type: NotificationType.SYSTEM,
      relatedEntityId: review.venue_id,
      relatedEntityType: 'venue',
    });
  }

  private async notifyReviewComment(input: {
    actorId: string;
    reviewId: string;
    parentCommentId: string | null;
  }): Promise<void> {
    const rows: Array<{
      review_author_id: string;
      venue_id: string;
      venue_name: string | null;
      actor_display_name: string | null;
      parent_author_id: string | null;
    }> = await this.commentRepo.manager.query(
      `
      SELECT r.account_id AS review_author_id,
             r.venue_id,
             v.name AS venue_name,
             COALESCE(
               NULLIF(TRIM(a.full_name), ''),
               NULLIF(split_part(a.email, '@', 1), ''),
               'Người dùng'
             ) AS actor_display_name,
             pc.account_id AS parent_author_id
      FROM interaction_schema.reviews r
      LEFT JOIN venue_schema.venues v ON v.id = r.venue_id
      LEFT JOIN auth_schema.accounts a ON a.id = $2
      LEFT JOIN interaction_schema.review_comments pc ON pc.id = $3
      WHERE r.id = $1
      `,
      [input.reviewId, input.actorId, input.parentCommentId],
    );

    const context = rows[0];
    if (!context) return;

    const actor = context.actor_display_name ?? 'Người dùng';
    const venueName = context.venue_name ?? 'địa điểm này';
    const notified = new Set<string>();

    if (
      input.parentCommentId &&
      context.parent_author_id &&
      context.parent_author_id !== input.actorId
    ) {
      await this.notificationService.createForAccount({
        accountId: context.parent_author_id,
        title: 'Có phản hồi mới cho bình luận của bạn',
        message: `${actor} đã trả lời bình luận của bạn tại ${venueName}.`,
        type: NotificationType.REVIEW_REPLY,
        relatedEntityId: context.venue_id,
        relatedEntityType: 'venue',
      });
      notified.add(context.parent_author_id);
    }

    if (
      context.review_author_id !== input.actorId &&
      !notified.has(context.review_author_id)
    ) {
      await this.notificationService.createForAccount({
        accountId: context.review_author_id,
        title: 'Có bình luận mới trên đánh giá của bạn',
        message: `${actor} đã bình luận về đánh giá của bạn tại ${venueName}.`,
        type: NotificationType.REVIEW_REPLY,
        relatedEntityId: context.venue_id,
        relatedEntityType: 'venue',
      });
    }
  }

  private async pickSeedAccounts(limit: number): Promise<string[]> {
    const rows = await this.reviewRepo.manager.query(
      `
      SELECT id
      FROM auth_schema.accounts
      WHERE is_active = true
      ORDER BY CASE WHEN type IN ('customer', 'owner') THEN 0 ELSE 1 END,
               CASE WHEN full_name IS NOT NULL AND TRIM(full_name) <> '' THEN 0 ELSE 1 END,
               random()
      LIMIT $1
      `,
      [Math.max(1, limit)],
    );
    let accounts = rows.map((row: { id: string }) => row.id).filter(Boolean);
    if (accounts.length === 0) {
      const fallbackRows = await this.reviewRepo.manager.query(
        `
        SELECT id
        FROM auth_schema.accounts
        ORDER BY random()
        LIMIT $1
        `,
        [Math.max(1, limit)],
      );
      accounts = fallbackRows.map((row: { id: string }) => row.id).filter(Boolean);
    }
    if (accounts.length === 0) {
      throw new NotFoundException('No accounts available to seed Google Maps reviews');
    }
    return accounts;
  }

  private async emitVenueReviewed(review: Review): Promise<void> {
    if (await this.ensureRmqConnected()) {
      this.events.emit(RMQ_EVENTS.VENUE_REVIEWED, {
        reviewId: review.id,
        accountId: review.account_id,
        venueId: review.venue_id,
        content: review.content,
        rating: review.rating,
        isVerifiedVisit: review.is_verified_visit,
      }).subscribe({
        next: () =>
          this.logger.log(`Emitted ${RMQ_EVENTS.VENUE_REVIEWED} for review ${review.id}`),
        error: (err: Error) =>
          this.logger.warn(`Failed to emit review event: ${err.message}`),
      });
    } else {
      this.logger.warn(
        `Skipping venue.reviewed event for review ${review.id} - RMQ not connected`,
      );
    }
  }
}
