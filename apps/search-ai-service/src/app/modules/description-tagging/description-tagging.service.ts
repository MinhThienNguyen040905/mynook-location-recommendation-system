import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TimeContext } from '@mynook/database';
import type { VenueDescribedEvent } from '@mynook/shared-types';
import { CategoryTagProviderService } from '../search/category-tag-provider.service.js';
import { DescriptionGroqService } from './description-groq.service.js';

/**
 * Score floor applied to each owner-seeded tag. Set deliberately lower than
 * what a single verified review (multiplier = 2) contributes, so real reviews
 * can always dominate self-claims as the venue accumulates real signal. The
 * search ranking divides matched-tag SUM by 3.0 and caps at 1.0, so 0.5 here
 * adds ~0.17 to a venue's normalised tag score per matched seed tag — enough
 * to lift a brand-new venue out of the "zero tag" cliff without overwhelming
 * review-derived data.
 */
const SEED_SCORE_FLOOR = 0.5;
const MIN_DESCRIPTION_LENGTH = 10;

@Injectable()
export class DescriptionTaggingService {
  private readonly logger = new Logger(DescriptionTaggingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly provider: CategoryTagProviderService,
    private readonly groq: DescriptionGroqService,
  ) {}

  /**
   * Process a venue-described event: ask Groq for applicable tag keys, then
   * upsert seed rows into `venue_tags` with `time_frame=all_day` and a small
   * floor score. Idempotent across re-runs (same description, owner edits)
   * because the upsert uses GREATEST(existing, floor) — never compounds and
   * never reduces a score that reviews have already pushed above the floor.
   *
   * `positive_count` stays at 0 on seed rows so they're distinguishable from
   * review-derived tags downstream (e.g. for analytics or admin tooling).
   */
  async processDescription(event: VenueDescribedEvent): Promise<void> {
    const description = event.description?.trim();
    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      this.logger.debug(
        `Venue ${event.venueId} description too short (${description?.length ?? 0} chars) — skipping seed tagging`,
      );
      return;
    }

    // Cross-schema lookup of category keys for this venue — gives Groq
    // context (e.g. "this is a cafe") so it picks tags grounded in the kind
    // of venue rather than tags that only fit a different category.
    const catRows: { key: string }[] = await this.dataSource.query(
      `SELECT c.key
         FROM venue_schema.venue_categories vc
         JOIN venue_schema.categories c ON c.id = vc.category_id
        WHERE vc.venue_id = $1 AND c.is_active = true`,
      [event.venueId],
    );
    const categoryKeys = catRows.map((r) => r.key);

    const candidateTags = await this.provider.getTopTags();

    const analysis = await this.groq.extractTags({
      name: event.name,
      branchName: event.branchName,
      description,
      categoryKeys,
      candidateTags,
    });
    if (!analysis || analysis.tags.length === 0) {
      this.logger.debug(`Venue ${event.venueId}: Groq returned no description tags`);
      return;
    }

    // Resolve keys → ids. `resolveTagIds` quietly drops any keys not in DB
    // (defensive — Groq is instructed to stick to the candidate list, but we
    // never rely on instruction-following for correctness).
    const tagIds = await this.provider.resolveTagIds(analysis.tags);
    if (tagIds.length === 0) {
      this.logger.debug(
        `Venue ${event.venueId}: no resolvable tag ids from Groq output [${analysis.tags.join(', ')}]`,
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const tagId of tagIds) {
        await queryRunner.query(
          `INSERT INTO search_schema.venue_tags
             (venue_id, tag_id, time_frame, score, positive_count, negative_count)
           VALUES ($1, $2, $3, $4, 0, 0)
           ON CONFLICT ON CONSTRAINT uq_venue_tags_venue_tag_time
           DO UPDATE SET score = GREATEST(search_schema.venue_tags.score, EXCLUDED.score)`,
          [event.venueId, tagId, TimeContext.ALL_DAY, SEED_SCORE_FLOOR],
        );
      }
      await queryRunner.commitTransaction();
      this.logger.log(
        `Seeded ${tagIds.length} description tags for venue ${event.venueId} ` +
          `(keys=[${analysis.tags.join(', ')}], floor=${SEED_SCORE_FLOOR})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Description tagging transaction failed for venue ${event.venueId}: ${err}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
