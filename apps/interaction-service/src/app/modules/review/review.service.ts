import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Review } from '@mynook/database';
import { RMQ_EVENTS, VenueReviewDeletedEvent } from '@mynook/shared-types';
import { CreateReviewDto } from './dto/create-review.dto.js';

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
      this.logger.warn(`RabbitMQ not available: ${(err as Error).message}. Review events will be skipped.`);
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
    const review = this.reviewRepo.create({
      account_id: accountId,
      venue_id: dto.venue_id,
      rating: dto.rating,
      content: dto.content ?? null,
      media: dto.media ?? [],
    });
    const saved = await this.reviewRepo.save(review);

    // Emit event for AI processing (non-blocking)
    if (this.rmqConnected) {
      this.events.emit(RMQ_EVENTS.VENUE_REVIEWED, {
        reviewId: saved.id,
        accountId: saved.account_id,
        venueId: saved.venue_id,
        content: saved.content,
        rating: saved.rating,
        isVerifiedVisit: saved.is_verified_visit,
      }).subscribe({
        next: () => this.logger.log(`Emitted ${RMQ_EVENTS.VENUE_REVIEWED} for review ${saved.id}`),
        error: (err: Error) => this.logger.warn(`Failed to emit review event: ${err.message}`),
      });
    } else {
      this.logger.warn(`Skipping venue.reviewed event for review ${saved.id} — RMQ not connected`);
    }

    return saved;
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
          this.logger.warn(
            `Failed to emit review-deleted event: ${err.message}`,
          ),
      });
    } else {
      this.logger.warn(
        `Skipping venue.review.deleted event for review ${reviewId} — RMQ not connected`,
      );
    }

    await this.reviewRepo.delete(reviewId);
  }
}
