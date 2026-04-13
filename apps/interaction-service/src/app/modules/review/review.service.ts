import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Review } from '@mynook/database';
import { RMQ_EVENTS } from '@mynook/shared-types';
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
}
