import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HfInference } from '@huggingface/inference';
import { Venue } from '@mynook/database';

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
/**
 * 5 second per-attempt embed call cap. HF cold-start can take ~2-3s; a longer cap
 * would stall background work if HF is slow. Retries multiply total wall time.
 */
const EMBED_TIMEOUT_MS = 5_000;
/**
 * Retry policy for transient HF failures (timeout, 429, 5xx, network).
 * Embedding is fire-and-forget so retries don't block the user — the user
 * already got their CRUD response. Goal: a venue created during HF cold-start
 * eventually gets its vector instead of going invisible to semantic search.
 *
 * Total worst-case wall time: 3 attempts × 5s timeout + 1s + 4s backoff = ~20s.
 */
const EMBED_MAX_ATTEMPTS = 3;
const EMBED_RETRY_BASE_MS = 1_000;

/**
 * Generates and persists `search_document` + `embedding` for venues so the
 * AI search service can rank them semantically. Runs in venue-service so the
 * hot create/update path owns data integrity without cross-service plumbing.
 *
 * Call sites should await `regenerateInBackground(id)` (fire-and-forget) so
 * the venue CRUD response isn't blocked by HuggingFace latency.
 */
@Injectable()
export class VenueEmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(VenueEmbeddingService.name);
  private hf!: HfInference;

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    const token = process.env['HUGGINGFACE_API_TOKEN'] || '';
    this.hf = new HfInference(token || undefined);
    this.logger.log(
      `VenueEmbeddingService ready (model: ${EMBEDDING_MODEL}, dim: ${EMBEDDING_DIM})`,
    );
  }

  /**
   * Fire-and-forget wrapper. Safe to call from controllers/services after
   * create/update — failures are logged and never propagate.
   */
  regenerateInBackground(venueId: string): void {
    this.regenerate(venueId).catch((err) => {
      this.logger.warn(
        `Background embedding generation failed for venue ${venueId}: ${err}`,
      );
    });
  }

  /** Rebuild `search_document` + `embedding` for a single venue, synchronous */
  async regenerate(venueId: string): Promise<void> {
    const venue = await this.venueRepo.findOne({
      where: { id: venueId },
      relations: { city_ref: true, district_ref: true },
    });
    if (!venue) {
      this.logger.debug(`Venue ${venueId} not found, skipping embedding`);
      return;
    }

    const doc = this.buildSearchDocument(venue);
    if (!doc.trim()) {
      this.logger.debug(`Venue ${venueId} has empty search doc; skipping`);
      return;
    }

    let vector: number[] | null = null;
    try {
      vector = await this.embedWithRetry(doc, venueId);
    } catch (err) {
      this.logger.warn(
        `HF embed failed for venue ${venueId} after ${EMBED_MAX_ATTEMPTS} attempts, saving doc without vector: ${err}`,
      );
    }

    // Update via raw SQL so we can cast the vector array to pgvector.
    if (vector && vector.length === EMBEDDING_DIM) {
      await this.dataSource.query(
        `UPDATE venue_schema.venues
           SET search_document = $1, embedding = $2::vector
         WHERE id = $3`,
        [doc, this.toPgVector(vector), venueId],
      );
    } else {
      await this.dataSource.query(
        `UPDATE venue_schema.venues
           SET search_document = $1
         WHERE id = $2`,
        [doc, venueId],
      );
    }
  }

  /**
   * Flatten venue metadata into a single searchable string. Kept here (not
   * in search-ai-service) so venue-service owns data integrity.
   */
  private buildSearchDocument(venue: Venue): string {
    const parts: string[] = [];
    if (venue.name) parts.push(venue.name);
    if (venue.branch_name) parts.push(venue.branch_name);
    if (venue.description) parts.push(venue.description);
    if (venue.address_line) parts.push(venue.address_line);
    if (venue.ward) parts.push(venue.ward);
    if (venue.district_ref?.name) parts.push(venue.district_ref.name);
    if (venue.city_ref?.name) parts.push(venue.city_ref.name);
    return parts.join('. ');
  }

  private async embedWithTimeout(text: string): Promise<number[]> {
    const result = await Promise.race([
      this.hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('HF embed timeout')),
          EMBED_TIMEOUT_MS,
        ),
      ),
    ]);
    return this.flatten(result);
  }

  /**
   * Wrap `embedWithTimeout` with exponential backoff. Retries only on transient
   * errors (timeout, 429, 5xx, network); 4xx (auth, bad input) fails fast since
   * retrying won't help. Backoff: 1s after attempt 1, 4s after attempt 2.
   */
  private async embedWithRetry(
    text: string,
    venueId: string,
  ): Promise<number[]> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= EMBED_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.embedWithTimeout(text);
      } catch (err) {
        lastErr = err;
        if (!this.isRetryableError(err) || attempt === EMBED_MAX_ATTEMPTS) {
          throw err;
        }
        const delay = EMBED_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `HF embed attempt ${attempt}/${EMBED_MAX_ATTEMPTS} failed for venue ${venueId}: ${err}. Retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastErr;
  }

  /**
   * Treat timeouts, rate-limits (429), server errors (5xx), and undifferentiated
   * fetch failures as retryable. Auth (401/403) and bad input (400) fail fast.
   */
  private isRetryableError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    if (/timeout/i.test(msg)) return true;
    if (/\b(429|5\d{2})\b/.test(msg)) return true;
    if (/network|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(msg))
      return true;
    if (/\b(400|401|403|404)\b/.test(msg)) return false;
    // Unknown errors → retry once rather than silently dropping the embedding
    return true;
  }

  private flatten(data: unknown): number[] {
    if (!Array.isArray(data)) return [];
    if (typeof data[0] === 'number') return data as number[];
    return this.flatten(data[0]);
  }

  private toPgVector(v: number[]): string {
    return `[${v.join(',')}]`;
  }
}
