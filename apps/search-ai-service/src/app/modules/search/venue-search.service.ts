import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog, TimeContext } from '@mynook/database';
import { SearchParserService } from './search-parser.service.js';
import { EmbeddingService } from './embedding.service.js';

export interface SearchResult {
  id: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
  latitude: number;
  longitude: number;
  media: unknown[];
  max_group_size: number;
  is_group_friendly: boolean;
  current_crowd_level: string;
  rating_avg: number;
  review_count: number;
  opening_hours: unknown;
  /** Combined relevance score (lower = more relevant) */
  relevance_score: number;
  /** Cosine distance to query vector */
  vector_distance: number | null;
  /** Matched tag keys */
  matched_tags: string[];
}

@Injectable()
export class VenueSearchService {
  private readonly logger = new Logger(VenueSearchService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly parser: SearchParserService,
    private readonly embedding: EmbeddingService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  /**
   * Hybrid Search — combines:
   * 1. Semantic similarity (pgvector cosine distance)
   * 2. Hard filters (capacity, time context, crowd level)
   * 3. Tag matching via VenueTag scores
   * 4. Rating-based ranking boost
   */
  async hybridSearch(
    rawQuery: string,
    accountId?: string,
    limit = 20,
  ): Promise<SearchResult[]> {
    // 1. Parse query for structured filters
    const parsed = this.parser.parse(rawQuery);
    this.logger.log(
      `Parsed: "${parsed.cleanQuery}" | capacity: ${parsed.capacity} | time: ${parsed.timeContext}`,
    );

    // 2. Generate embedding vector for semantic search
    let queryVector: number[] | null = null;
    try {
      if (parsed.cleanQuery.length > 0) {
        queryVector = await this.embedding.embed(parsed.cleanQuery);
      }
    } catch (error) {
      this.logger.warn(`Embedding failed, falling back to non-semantic search: ${error}`);
    }

    // 3. Build and execute hybrid query
    const results = await this.executeHybridQuery(
      parsed.cleanQuery,
      queryVector,
      parsed.capacity,
      parsed.timeContext,
      limit,
    );

    // 4. Log search (fire-and-forget)
    this.logSearch(rawQuery, parsed, accountId).catch(() => {});

    return results;
  }

  private async executeHybridQuery(
    cleanQuery: string,
    queryVector: number[] | null,
    minCapacity: number | null,
    timeContext: TimeContext | null,
    limit: number,
  ): Promise<SearchResult[]> {
    const params: unknown[] = [];
    let paramIndex = 0;

    const nextParam = (value: unknown): string => {
      params.push(value);
      paramIndex++;
      return `$${paramIndex}`;
    };

    // -- SELECT clause --
    let vectorDistanceExpr = 'NULL';
    let vectorScoreExpr = '0';

    if (queryVector) {
      const vecParam = nextParam(this.embedding.toPgVector(queryVector));
      vectorDistanceExpr = `(v.embedding <=> ${vecParam}::vector)`;
      // Normalize distance to 0-1 score (1 = most similar)
      vectorScoreExpr = `(1 - LEAST(${vectorDistanceExpr}, 1.0))`;
    }

    // Tag score: sum of matching positive VenueTag scores
    let tagScoreExpr = '0';
    const tagJoins: string[] = [];

    if (timeContext) {
      const timeParam = nextParam(timeContext);
      const allDayParam = nextParam(TimeContext.ALL_DAY);
      tagJoins.push(
        `LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(vt.score), 0) AS total_tag_score
          FROM search_schema.venue_tags vt
          WHERE vt.venue_id = v.id
            AND vt.score > 0
            AND (vt.time_frame = ${timeParam} OR vt.time_frame = ${allDayParam})
        ) tag_agg ON true`,
      );
      tagScoreExpr = 'COALESCE(tag_agg.total_tag_score, 0)';
    } else {
      tagJoins.push(
        `LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(vt.score), 0) AS total_tag_score
          FROM search_schema.venue_tags vt
          WHERE vt.venue_id = v.id AND vt.score > 0
        ) tag_agg ON true`,
      );
      tagScoreExpr = 'COALESCE(tag_agg.total_tag_score, 0)';
    }

    // Matched tags subquery
    const matchedTagsSubquery = `(
      SELECT COALESCE(array_agg(t.key), ARRAY[]::text[])
      FROM search_schema.venue_tags vt
      JOIN search_schema.tags t ON t.id = vt.tag_id
      WHERE vt.venue_id = v.id AND vt.score > 0
    )`;

    // -- WHERE clause --
    const conditions: string[] = [
      `v.is_active = true`,
      `v.current_crowd_level != 'full'`, // real-time filter
    ];

    if (minCapacity) {
      const capParam = nextParam(minCapacity);
      conditions.push(`v.max_group_size >= ${capParam}`);
    }

    // Text search fallback when no embedding available
    if (!queryVector && cleanQuery.length > 0) {
      const searchParam = nextParam(`%${cleanQuery}%`);
      // Use ILIKE for basic text matching as fallback
      conditions.push(
        `(v.name ILIKE ${searchParam} OR v.description ILIKE ${searchParam} OR v.search_document ILIKE ${searchParam} OR v.address ILIKE ${searchParam})`,
      );
    }

    // -- Combined relevance score --
    // Weights: semantic 0.5, tag score 0.3, rating 0.2
    const combinedScore = `(
      ${vectorScoreExpr} * 0.5
      + LEAST(${tagScoreExpr}::float / GREATEST(NULLIF(${tagScoreExpr}, 0), 10), 1.0) * 0.3
      + (v.rating_avg / 5.0) * 0.2
    )`;

    const limitParam = nextParam(limit);

    const sql = `
      SELECT
        v.id, v.name, v.branch_name, v.description, v.address, v.city, v.district,
        v.latitude, v.longitude, v.media, v.max_group_size, v.is_group_friendly,
        v.current_crowd_level, v.rating_avg, v.review_count, v.opening_hours,
        ${vectorDistanceExpr} AS vector_distance,
        ${combinedScore} AS relevance_score,
        ${matchedTagsSubquery} AS matched_tags
      FROM venue_schema.venues v
      ${tagJoins.join('\n')}
      WHERE ${conditions.join(' AND ')}
      ORDER BY relevance_score DESC
      LIMIT ${limitParam}
    `;

    this.logger.debug(`Hybrid search SQL params: ${JSON.stringify(params)}`);

    const rows = await this.dataSource.query(sql, params);

    return rows.map((row: Record<string, unknown>) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      branch_name: row['branch_name'] as string | null,
      description: row['description'] as string | null,
      address: row['address'] as string,
      city: row['city'] as string,
      district: row['district'] as string | null,
      latitude: row['latitude'] as number,
      longitude: row['longitude'] as number,
      media: row['media'] as unknown[],
      max_group_size: row['max_group_size'] as number,
      is_group_friendly: row['is_group_friendly'] as boolean,
      current_crowd_level: row['current_crowd_level'] as string,
      rating_avg: parseFloat(row['rating_avg'] as string) || 0,
      review_count: row['review_count'] as number,
      opening_hours: row['opening_hours'],
      relevance_score: parseFloat(row['relevance_score'] as string) || 0,
      vector_distance: row['vector_distance']
        ? parseFloat(row['vector_distance'] as string)
        : null,
      matched_tags: (row['matched_tags'] as string[]) || [],
    }));
  }

  private async logSearch(
    rawQuery: string,
    parsed: { cleanQuery: string; capacity: number | null; timeContext: TimeContext | null },
    accountId?: string,
  ): Promise<void> {
    try {
      await this.searchLogRepo.save({
        account_id: accountId || null,
        search_query: rawQuery,
        filters_used: {
          cleanQuery: parsed.cleanQuery,
          capacity: parsed.capacity,
          timeContext: parsed.timeContext,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log search: ${error}`);
    }
  }
}
