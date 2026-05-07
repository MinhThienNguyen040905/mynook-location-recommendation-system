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

  /** Lấy danh sách reviews của một venue (mới nhất trước) */
  async findByVenue(venueId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { venue_id: venueId },
      order: { created_at: 'DESC' },
    });
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
      const saved = await this.saveAndEmitReview({
        accountId,
        venueId: dto.venue_id,
        rating: review.rating,
        content: review.content,
        media: [],
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
