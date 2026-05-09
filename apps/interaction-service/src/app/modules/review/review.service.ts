import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { Review } from '@mynook/database';
import { RMQ_EVENTS, VenueReviewDeletedEvent } from '@mynook/shared-types';
import { CreateReviewDto } from './dto/create-review.dto.js';

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

@Injectable()
export class ReviewService implements OnModuleInit {
  private readonly logger = new Logger(ReviewService.name);
  private rmqConnected = false;

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @Inject('EVENTS_SERVICE')
    private readonly events: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.events.connect();
      this.rmqConnected = true;
      this.logger.log('Connected to RabbitMQ (EVENTS_SERVICE)');
    } catch (err) {
      this.logger.warn(
        `RabbitMQ not available: ${(err as Error).message}. Review events will be skipped.`,
      );
    }
  }

  /** Lấy danh sách reviews của một venue (mới nhất trước), kèm thông tin người viết */
  async findByVenue(venueId: string): Promise<Array<Review & { author: { id: string; full_name: string | null; avatar_url: string | null } | null }>> {
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
             r.updated_at,
             a.id           AS author_id,
             a.full_name    AS author_full_name,
             a.avatar_url   AS author_avatar_url
        FROM interaction_schema.reviews r
        LEFT JOIN auth_schema.accounts a ON a.id = r.account_id
       WHERE r.venue_id = $1
       ORDER BY r.created_at DESC
      `,
      [venueId],
    );

    return rows.map((row: Record<string, unknown>) => ({
      id: row['id'],
      account_id: row['account_id'],
      venue_id: row['venue_id'],
      content: row['content'],
      rating: row['rating'],
      media: row['media'] ?? [],
      ai_analysis_json: row['ai_analysis_json'],
      is_verified_visit: row['is_verified_visit'],
      created_at: row['created_at'],
      updated_at: row['updated_at'],
      author: row['author_id']
        ? {
            id: row['author_id'] as string,
            full_name: (row['author_full_name'] as string | null) ?? null,
            avatar_url: (row['author_avatar_url'] as string | null) ?? null,
          }
        : null,
    })) as Array<Review & { author: { id: string; full_name: string | null; avatar_url: string | null } | null }>;
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

    if (this.rmqConnected) {
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
        `Skipping venue.review.deleted event for review ${reviewId} â€” RMQ not connected`,
      );
    }

    await this.reviewRepo.delete(reviewId);
  }

  private async saveAndEmitReview(input: {
    accountId: string;
    venueId: string;
    rating: number;
    content: string | null;
    media: unknown[];
    isVerifiedVisit: boolean;
  }): Promise<Review> {
    const review = this.reviewRepo.create({
      account_id: input.accountId,
      venue_id: input.venueId,
      rating: input.rating,
      content: input.content,
      media: input.media,
      is_verified_visit: input.isVerifiedVisit,
    });
    const saved = await this.reviewRepo.save(review);
    await this.emitVenueReviewed(saved);
    return saved;
  }

  private async pickSeedAccounts(limit: number): Promise<string[]> {
    const rows = await this.reviewRepo.manager.query(
      `
      SELECT id
      FROM auth_schema.accounts
      WHERE is_active = true
      ORDER BY CASE WHEN type IN ('customer', 'owner') THEN 0 ELSE 1 END, random()
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
    if (this.rmqConnected) {
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
        `Skipping venue.reviewed event for review ${review.id} â€” RMQ not connected`,
      );
    }
  }
}
