import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HfInference } from '@huggingface/inference';
import { Venue } from '@mynook/database';

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
/**
 * 5 second embed call cap. HF cold-start can take ~2-3s; a longer cap
 * would stall the venue create/update response if HF is slow.
 */
const EMBED_TIMEOUT_MS = 5_000;

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
      vector = await this.embedWithTimeout(doc);
    } catch (err) {
      this.logger.warn(
        `HF embed failed for venue ${venueId}, saving doc without vector: ${err}`,
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

  private flatten(data: unknown): number[] {
    if (!Array.isArray(data)) return [];
    if (typeof data[0] === 'number') return data as number[];
    return this.flatten(data[0]);
  }

  private toPgVector(v: number[]): string {
    return `[${v.join(',')}]`;
  }
}
