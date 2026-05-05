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

export interface ReviewDeletedEvent {
  reviewId: string;
  venueId: string;
  rating: number;
  isVerifiedVisit: boolean;
  analysis: {
    positive_tags?: string[];
    negative_tags?: string[];
    time_context?: 'morning' | 'afternoon' | 'evening' | 'all_day' | null;
  } | null;
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

      this.logger.log(`AI analysis: positive_tags=${JSON.stringify(analysis.positive_tags)}, negative_tags=${JSON.stringify(analysis.negative_tags)}, new_tags=${JSON.stringify(analysis.new_tags.map(t => t.key))}`);
      this.logger.log(`tagKeyToId map: ${JSON.stringify([...tagKeyToId.entries()])}`);

      // 3b. Upsert positive tags (increase score)
      for (const tagKey of analysis.positive_tags) {
        const tagId = tagKeyToId.get(tagKey);
        if (!tagId) {
          this.logger.warn(`Tag key "${tagKey}" not found in tagKeyToId — skipping`);
          continue;
        }
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
        if (!tagId) {
          this.logger.warn(`Tag key "${tagKey}" not found in tagKeyToId — skipping`);
          continue;
        }
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

    // Check if row exists
    const existing = await queryRunner.query(
      `SELECT id, score, positive_count, negative_count FROM search_schema.venue_tags
       WHERE venue_id = $1 AND tag_id = $2 AND time_frame = $3`,
      [venueId, tagId, timeFrame],
    );

    if (existing.length > 0) {
      await queryRunner.query(
        `UPDATE search_schema.venue_tags
         SET score = score + $1, positive_count = positive_count + $2, negative_count = negative_count + $3
         WHERE venue_id = $4 AND tag_id = $5 AND time_frame = $6`,
        [scoreDelta, positiveInc, negativeInc, venueId, tagId, timeFrame],
      );
    } else {
      await queryRunner.query(
        `INSERT INTO search_schema.venue_tags (venue_id, tag_id, time_frame, score, positive_count, negative_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venueId, tagId, timeFrame, scoreDelta, positiveInc, negativeInc],
      );
    }

    this.logger.log(`Upserted venue_tag: venue=${venueId}, tag=${tagId}, timeFrame=${timeFrame}, scoreDelta=${scoreDelta}`);
  }

  private mapTimeContext(
    tc: 'morning' | 'afternoon' | 'evening' | 'all_day' | null | undefined,
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

  /**
   * Reverse the venue_tag deltas previously applied by `processReview` for a review.
   *
   * Best-effort: if `analysis` is null (Groq failed during create — no tags applied),
   * or a tag key has since been deleted/merged from `tags` master, that contribution
   * is silently skipped. After the per-tag reverts, any venue_tag row that ended up
   * with score=0 AND positive_count=0 AND negative_count=0 is hard-deleted so the
   * `trg_venue_tags_bump_usage` trigger decrements `tags.usage_count` correctly.
   *
   * Not idempotent against RMQ redelivery — same caveat as `processReview`.
   */
  async revertReview(event: ReviewDeletedEvent): Promise<void> {
    const analysis = event.analysis;
    if (!analysis) {
      this.logger.log(`Review ${event.reviewId} has no AI analysis snapshot — nothing to revert`);
      return;
    }
    const positive = analysis.positive_tags ?? [];
    const negative = analysis.negative_tags ?? [];
    if (positive.length === 0 && negative.length === 0) {
      this.logger.log(`Review ${event.reviewId} analysis has no tags — nothing to revert`);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const multiplier = event.isVerifiedVisit ? 2 : 1;
      const timeFrame = this.mapTimeContext(analysis.time_context);

      // Resolve all tag keys → ids in one query
      const allKeys = [...new Set([...positive, ...negative])];
      const tagRows: { id: string; key: string }[] =
        allKeys.length > 0
          ? await queryRunner.query(
              `SELECT id, key FROM search_schema.tags WHERE key = ANY($1::text[])`,
              [allKeys],
            )
          : [];
      const keyToId = new Map(tagRows.map((r) => [r.key, r.id]));

      for (const key of positive) {
        const tagId = keyToId.get(key);
        if (!tagId) {
          this.logger.warn(`Tag key "${key}" missing from master — cannot revert`);
          continue;
        }
        // Original positive upsert: score += +multiplier, positive_count += 1
        // Revert: score += -multiplier, positive_count = GREATEST(positive_count - 1, 0)
        await this.applyRevertDelta(queryRunner, event.venueId, tagId, timeFrame, -multiplier, true);
      }

      for (const key of negative) {
        const tagId = keyToId.get(key);
        if (!tagId) {
          this.logger.warn(`Tag key "${key}" missing from master — cannot revert`);
          continue;
        }
        // Original negative upsert: score += -multiplier, negative_count += 1
        // Revert: score += +multiplier, negative_count = GREATEST(negative_count - 1, 0)
        await this.applyRevertDelta(queryRunner, event.venueId, tagId, timeFrame, multiplier, false);
      }

      // Cleanup empty rows so usage_count trigger decrements properly
      await queryRunner.query(
        `DELETE FROM search_schema.venue_tags
         WHERE venue_id = $1 AND score = 0 AND positive_count = 0 AND negative_count = 0`,
        [event.venueId],
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `Reverted review ${event.reviewId}: -${positive.length} positive, -${negative.length} negative (multiplier=${multiplier}, timeFrame=${timeFrame})`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Revert transaction failed for review ${event.reviewId}: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async applyRevertDelta(
    queryRunner: import('typeorm').QueryRunner,
    venueId: string,
    tagId: string,
    timeFrame: TimeContext,
    scoreDelta: number,
    wasPositive: boolean,
  ): Promise<void> {
    const positiveDec = wasPositive ? 1 : 0;
    const negativeDec = wasPositive ? 0 : 1;
    await queryRunner.query(
      `UPDATE search_schema.venue_tags
       SET score = score + $1,
           positive_count = GREATEST(positive_count - $2, 0),
           negative_count = GREATEST(negative_count - $3, 0)
       WHERE venue_id = $4 AND tag_id = $5 AND time_frame = $6`,
      [scoreDelta, positiveDec, negativeDec, venueId, tagId, timeFrame],
    );
  }
}
