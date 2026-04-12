import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tag, TimeContext } from '@mynook/database';
import { GroqAiService, ReviewAnalysis } from './groq-ai.service.js';

export interface ReviewCreatedEvent {
  reviewId: string;
  accountId: string;
  venueId: string;
  content: string | null;
  rating: number;
  isVerifiedVisit: boolean;
}

@Injectable()
export class ReviewProcessingService {
  private readonly logger = new Logger(ReviewProcessingService.name);

  constructor(
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    private readonly dataSource: DataSource,
    private readonly groqAi: GroqAiService,
  ) {}

  /**
   * Process a newly created review:
   * 1. Call Groq AI to analyze sentiment + extract tags
   * 2. Upsert VenueTag scores in a transaction
   * 3. Return the AI analysis JSON (to be saved on the Review)
   */
  async processReview(event: ReviewCreatedEvent): Promise<ReviewAnalysis | null> {
    if (!event.content) {
      this.logger.log(`Review ${event.reviewId} has no text content — skipping AI analysis`);
      return null;
    }

    // 1. Get existing tags for the prompt
    const existingTags = await this.tagRepo.find();
    const existingTagKeys = existingTags.map((t) => t.key);

    // 2. Call Groq AI
    const analysis = await this.groqAi.analyzeReview(
      event.content,
      event.rating,
      existingTagKeys,
    );

    if (!analysis) return null;

    // 3. Upsert tags in a database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const scoreMultiplier = event.isVerifiedVisit ? 2 : 1;
      const timeFrame = this.mapTimeContext(analysis.time_context);

      // 3a. Insert new tags suggested by AI
      const tagKeyToId = new Map(existingTags.map((t) => [t.key, t.id]));

      for (const newTag of analysis.new_tags) {
        const existing = await queryRunner.manager.findOne(Tag, {
          where: { key: newTag.key },
        });
        if (!existing) {
          const created = await queryRunner.manager.save(Tag, {
            key: newTag.key,
            display_name: newTag.display_name,
            category: newTag.category,
          });
          tagKeyToId.set(created.key, created.id);
          this.logger.log(`Created new tag: ${created.key}`);
        } else {
          tagKeyToId.set(existing.key, existing.id);
        }
      }

      // 3b. Upsert positive tags (increase score)
      for (const tagKey of analysis.positive_tags) {
        const tagId = tagKeyToId.get(tagKey);
        if (!tagId) continue;
        await this.upsertVenueTag(
          queryRunner,
          event.venueId,
          tagId,
          timeFrame,
          scoreMultiplier,
          true,
        );
      }

      // 3c. Upsert negative tags (decrease score)
      for (const tagKey of analysis.negative_tags) {
        const tagId = tagKeyToId.get(tagKey);
        if (!tagId) continue;
        await this.upsertVenueTag(
          queryRunner,
          event.venueId,
          tagId,
          timeFrame,
          scoreMultiplier,
          false,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Review ${event.reviewId} processed: ${analysis.positive_tags.length} positive, ${analysis.negative_tags.length} negative tags`,
      );

      return analysis;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction failed for review ${event.reviewId}: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Upsert a VenueTag row: increment/decrement score and counts.
   * Uses INSERT ... ON CONFLICT for atomic upsert.
   */
  private async upsertVenueTag(
    queryRunner: import('typeorm').QueryRunner,
    venueId: string,
    tagId: string,
    timeFrame: TimeContext,
    multiplier: number,
    isPositive: boolean,
  ): Promise<void> {
    const scoreDelta = isPositive ? multiplier : -multiplier;
    const positiveInc = isPositive ? 1 : 0;
    const negativeInc = isPositive ? 0 : 1;

    await queryRunner.query(
      `INSERT INTO search_schema.venue_tags (venue_id, tag_id, time_frame, score, positive_count, negative_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (venue_id, tag_id, time_frame)
       DO UPDATE SET
         score = search_schema.venue_tags.score + $4,
         positive_count = search_schema.venue_tags.positive_count + $5,
         negative_count = search_schema.venue_tags.negative_count + $6`,
      [venueId, tagId, timeFrame, scoreDelta, positiveInc, negativeInc],
    );
  }

  private mapTimeContext(
    tc: 'morning' | 'afternoon' | 'evening' | 'all_day' | null,
  ): TimeContext {
    switch (tc) {
      case 'morning':
        return TimeContext.MORNING;
      case 'afternoon':
        return TimeContext.AFTERNOON;
      case 'evening':
        return TimeContext.EVENING;
      default:
        return TimeContext.ALL_DAY;
    }
  }
}
