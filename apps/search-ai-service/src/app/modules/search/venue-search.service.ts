import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SearchLog, TimeContext } from '@mynook/database';
import { SearchParserService } from './search-parser.service.js';
import { EmbeddingService } from './embedding.service.js';
import {
  ExtractedQuery,
  QueryExtractionService,
} from './query-extraction.service.js';
import { CategoryTagProviderService } from './category-tag-provider.service.js';

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
  relevance_score: number;
  vector_distance: number | null;
  name_score: number;
  matched_tags: string[];
  matched_categories: string[];
  /** Present only when debug=true */
  score_breakdown?: ScoreBreakdown;
}

interface ScoreBreakdown {
  semantic: number;
  tag: number;
  name: number;
  category_match: number;
  rating: number;
  strategy: string;
}

interface SearchStrategy {
  name: string;
  nameW: number;
  semW: number;
  tagW: number;
  categoryBoost: number;
  ratingW: number;
  applyCategoryHardFilter: boolean;
  applyRatingHardFilter: boolean;
  minNameScore: number | null;
}

@Injectable()
export class VenueSearchService {
  private readonly logger = new Logger(VenueSearchService.name);
  private readonly MIN_RESULTS_BEFORE_FALLBACK = 5;
  private readonly RATING_THRESHOLD = 4.0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly parser: SearchParserService,
    private readonly embedding: EmbeddingService,
    private readonly queryExtractor: QueryExtractionService,
    private readonly provider: CategoryTagProviderService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  async hybridSearch(
    rawQuery: string,
    accountId?: string,
    limit = 20,
    offset = 0,
    debug = false,
  ): Promise<SearchResult[]> {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) return [];

    // 1. Fast regex parse (capacity + time)
    const parsed = this.parser.parse(trimmed);

    // 2. Kick off Groq extraction and embedding IN PARALLEL
    const [extraction, embedResult] = await Promise.all([
      this.queryExtractor.extract(trimmed),
      this.safeEmbed(parsed.cleanQuery || trimmed),
    ]);

    // 3. Merge time context (regex wins, then Groq fallback)
    const timeContext = parsed.timeContext ?? extraction.time_context;

    // 4. Resolve keys → ids for SQL
    const [matchedCategoryIds, matchedTagIds, excludedTagIds] = await Promise.all([
      this.provider.resolveCategoryIds(extraction.categories),
      this.provider.resolveTagIds(extraction.tags),
      this.provider.resolveTagIds(extraction.excluded_tags),
    ]);

    // 5. Pick strategy by intent
    const strategy = this.buildStrategy(extraction);

    this.logger.log(
      `q="${trimmed}" intent=${extraction.intent} conf=${extraction.confidence} ` +
        `name="${extraction.possible_name ?? ''}" cats=${extraction.categories.length} ` +
        `tags=${extraction.tags.length} excl=${extraction.excluded_tags.length}`,
    );

    // 6. Execute query — retry with relaxed strategy if too few results
    let results = await this.executeHybridQuery({
      cleanQuery: parsed.cleanQuery || trimmed,
      queryVector: embedResult,
      minCapacity: parsed.capacity,
      timeContext,
      extraction,
      strategy,
      matchedCategoryIds,
      matchedTagIds,
      excludedTagIds,
      limit,
      offset,
      debug,
    });

    if (
      results.length < this.MIN_RESULTS_BEFORE_FALLBACK &&
      (strategy.applyCategoryHardFilter ||
        strategy.applyRatingHardFilter ||
        strategy.minNameScore !== null)
    ) {
      this.logger.log(
        `Only ${results.length} results with strict strategy; relaxing filters`,
      );
      const relaxed: SearchStrategy = {
        ...strategy,
        applyCategoryHardFilter: false,
        applyRatingHardFilter: false,
        minNameScore: null,
      };
      results = await this.executeHybridQuery({
        cleanQuery: parsed.cleanQuery || trimmed,
        queryVector: embedResult,
        minCapacity: parsed.capacity,
        timeContext,
        extraction,
        strategy: relaxed,
        matchedCategoryIds,
        matchedTagIds,
        excludedTagIds,
        limit,
        offset,
        debug,
      });
    }

    // 7. Log search (fire-and-forget)
    this.logSearch(trimmed, parsed, extraction, accountId).catch(() => {});

    return results;
  }

  // ── Strategy selection ───────────────────────────────────────────

  private buildStrategy(ext: ExtractedQuery): SearchStrategy {
    switch (ext.intent) {
      case 'name':
        return {
          name: 'name',
          nameW: 0.7,
          semW: 0.1,
          tagW: 0.1,
          categoryBoost: 0,
          ratingW: 0.1,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: 0.3,
        };
      case 'attribute':
        return {
          name: 'attribute',
          nameW: 0,
          semW: 0.4,
          tagW: 0.4,
          categoryBoost: 0.1,
          ratingW: 0.1,
          applyCategoryHardFilter:
            ext.confidence === 'high' && ext.categories.length > 0,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: null,
        };
      case 'mixed':
        return {
          name: 'mixed',
          nameW: 0.4,
          semW: 0.2,
          tagW: 0.2,
          categoryBoost: 0.1,
          ratingW: 0.1,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: null,
        };
      case 'unclear':
      default:
        return {
          name: 'unclear',
          nameW: 0.2,
          semW: 0.5,
          tagW: 0.2,
          categoryBoost: 0,
          ratingW: 0.1,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: false,
          minNameScore: null,
        };
    }
  }

  private async safeEmbed(text: string): Promise<number[] | null> {
    try {
      if (!text) return null;
      return await this.embedding.embed(text);
    } catch (err) {
      this.logger.warn(`Embedding failed, continuing without vector: ${err}`);
      return null;
    }
  }

  // ── SQL execution ────────────────────────────────────────────────

  private async executeHybridQuery(opts: {
    cleanQuery: string;
    queryVector: number[] | null;
    minCapacity: number | null;
    timeContext: TimeContext | null;
    extraction: ExtractedQuery;
    strategy: SearchStrategy;
    matchedCategoryIds: string[];
    matchedTagIds: string[];
    excludedTagIds: string[];
    limit: number;
    offset: number;
    debug: boolean;
  }): Promise<SearchResult[]> {
    const {
      cleanQuery,
      queryVector,
      minCapacity,
      timeContext,
      extraction,
      strategy,
      matchedCategoryIds,
      matchedTagIds,
      excludedTagIds,
      limit,
      offset,
      debug,
    } = opts;

    const params: unknown[] = [];
    let idx = 0;
    const p = (v: unknown): string => {
      params.push(v);
      idx++;
      return `$${idx}`;
    };

    // Semantic score expression — NULL-safe (0 when venue has no embedding)
    let semanticExpr = '0';
    let vectorDistExpr = 'NULL::float';
    if (queryVector) {
      const vec = p(this.embedding.toPgVector(queryVector));
      vectorDistExpr = `CASE WHEN v.embedding IS NULL THEN NULL ELSE (v.embedding <=> ${vec}::vector) END`;
      semanticExpr = `CASE WHEN v.embedding IS NULL THEN 0 ELSE (1 - LEAST(v.embedding <=> ${vec}::vector, 1.0)) END`;
    }

    // Matched-tag score — SUM only of tags the query actually mentions.
    // Optionally filtered by time_frame (fall back to ALL_DAY).
    let matchedTagScoreExpr = '0';
    if (matchedTagIds.length > 0) {
      const tagIdsParam = p(matchedTagIds);
      let timeCondition = '';
      if (timeContext) {
        const tp = p(timeContext);
        const allDay = p(TimeContext.ALL_DAY);
        timeCondition = `AND (vt.time_frame = ${tp} OR vt.time_frame = ${allDay})`;
      }
      matchedTagScoreExpr = `(
        SELECT COALESCE(SUM(vt.score), 0)::float
        FROM search_schema.venue_tags vt
        WHERE vt.venue_id = v.id
          AND vt.tag_id = ANY(${tagIdsParam}::uuid[])
          AND vt.score > 0
          ${timeCondition}
      )`;
    }

    // Excluded-tag penalty — sum of scores for negated tags (subtracted later)
    let excludedTagPenaltyExpr = '0';
    if (excludedTagIds.length > 0) {
      const exIdsParam = p(excludedTagIds);
      excludedTagPenaltyExpr = `(
        SELECT COALESCE(SUM(vt.score), 0)::float
        FROM search_schema.venue_tags vt
        WHERE vt.venue_id = v.id
          AND vt.tag_id = ANY(${exIdsParam}::uuid[])
          AND vt.score > 0
      )`;
    }

    // Category match flag
    let categoryMatchExpr = '0';
    if (matchedCategoryIds.length > 0) {
      const catIdsParam = p(matchedCategoryIds);
      categoryMatchExpr = `(
        CASE WHEN EXISTS (
          SELECT 1 FROM venue_schema.venue_categories vc
          WHERE vc.venue_id = v.id AND vc.category_id = ANY(${catIdsParam}::uuid[])
        ) THEN 1 ELSE 0 END
      )`;
    }

    // Matched category keys (return in result for UI)
    const matchedCategoriesExpr = `(
      SELECT COALESCE(array_agg(c.key), ARRAY[]::text[])
      FROM venue_schema.venue_categories vc
      JOIN venue_schema.categories c ON c.id = vc.category_id
      WHERE vc.venue_id = v.id
    )`;

    // Matched tag keys for display — re-push ids as a separate param to
    // keep the subquery self-contained (avoids off-by-one bugs when
    // reusing earlier param indexes).
    let matchedTagsKeysExpr = `ARRAY[]::text[]`;
    if (matchedTagIds.length > 0) {
      const tagIdsForKeys = p(matchedTagIds);
      matchedTagsKeysExpr = `(
        SELECT COALESCE(array_agg(DISTINCT t.key), ARRAY[]::text[])
        FROM search_schema.venue_tags vt
        JOIN search_schema.tags t ON t.id = vt.tag_id
        WHERE vt.venue_id = v.id
          AND vt.tag_id = ANY(${tagIdsForKeys}::uuid[])
          AND vt.score > 0
      )`;
    }

    // Name similarity — pg_trgm + f_unaccent wrapper (IMMUTABLE).
    // The same wrapper must be used on both sides so the planner can pick
    // the GIN expression indexes defined in migration 007.
    let nameScoreExpr = '0';
    const name = extraction.possible_name;
    if (name) {
      const np = p(name);
      nameScoreExpr = `GREATEST(
        similarity(public.f_unaccent(lower(v.name)), public.f_unaccent(lower(${np}))),
        similarity(public.f_unaccent(lower(coalesce(v.branch_name, ''))), public.f_unaccent(lower(${np})))
      )`;
    }

    // Normalized tag score — cap at 1.0 so it doesn't dominate
    const normTagScore = `LEAST((${matchedTagScoreExpr}) / 3.0, 1.0)`;
    const normExcluded = `LEAST((${excludedTagPenaltyExpr}) / 3.0, 1.0)`;

    const combinedScore = `(
        ${strategy.semW} * (${semanticExpr})
      + ${strategy.tagW} * (${normTagScore})
      + ${strategy.nameW} * (${nameScoreExpr})
      + ${strategy.categoryBoost} * (${categoryMatchExpr})
      + ${strategy.ratingW} * (v.rating_avg / 5.0)
      - 0.15 * (${normExcluded})
    )`;

    // WHERE clauses
    const where: string[] = [
      'v.is_active = true',
      `v.current_crowd_level != 'full'`,
    ];
    if (minCapacity) {
      where.push(`v.max_group_size >= ${p(minCapacity)}`);
    }
    if (strategy.applyCategoryHardFilter && matchedCategoryIds.length > 0) {
      const catIdsHard = p(matchedCategoryIds);
      where.push(`EXISTS (
        SELECT 1 FROM venue_schema.venue_categories vc
        WHERE vc.venue_id = v.id AND vc.category_id = ANY(${catIdsHard}::uuid[])
      )`);
    }
    if (strategy.applyRatingHardFilter) {
      where.push(`v.rating_avg >= ${p(this.RATING_THRESHOLD)}`);
    }
    if (strategy.minNameScore !== null && name) {
      where.push(`(${nameScoreExpr}) >= ${p(strategy.minNameScore)}`);
    }

    // Location filters — soft ILIKE (boosted inside score via semantic anyway)
    if (extraction.location.city) {
      where.push(`v.city ILIKE ${p(`%${extraction.location.city}%`)}`);
    }
    if (extraction.location.district) {
      where.push(
        `(v.district ILIKE ${p(`%${extraction.location.district}%`)} OR v.address ILIKE ${p(`%${extraction.location.district}%`)})`,
      );
    }
    if (extraction.location.street) {
      where.push(`v.address ILIKE ${p(`%${extraction.location.street}%`)}`);
    }

    // Pure-text fallback when embedding failed and no name was extracted
    if (!queryVector && !name && cleanQuery.length >= 2) {
      const likeParam = p(`%${cleanQuery}%`);
      where.push(
        `(v.name ILIKE ${likeParam} OR v.description ILIKE ${likeParam} OR v.search_document ILIKE ${likeParam})`,
      );
    }

    const limitParam = p(Math.min(Math.max(limit, 1), 50));
    const offsetParam = p(Math.max(offset, 0));

    const sql = `
      SELECT
        v.id, v.name, v.branch_name, v.description, v.address, v.city, v.district,
        v.latitude, v.longitude, v.media, v.max_group_size, v.is_group_friendly,
        v.current_crowd_level, v.rating_avg, v.review_count, v.opening_hours,
        ${vectorDistExpr} AS vector_distance,
        (${semanticExpr}) AS d_semantic,
        (${normTagScore}) AS d_tag,
        (${nameScoreExpr}) AS d_name,
        (${categoryMatchExpr})::float AS d_cat,
        (v.rating_avg / 5.0) AS d_rating,
        ${combinedScore} AS relevance_score,
        ${matchedTagsKeysExpr} AS matched_tags,
        ${matchedCategoriesExpr} AS matched_categories
      FROM venue_schema.venues v
      WHERE ${where.join(' AND ')}
      ORDER BY relevance_score DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((row: Record<string, unknown>) => {
      const r: SearchResult = {
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
        rating_avg: parseFloat(String(row['rating_avg'])) || 0,
        review_count: row['review_count'] as number,
        opening_hours: row['opening_hours'],
        relevance_score: parseFloat(String(row['relevance_score'])) || 0,
        vector_distance:
          row['vector_distance'] !== null && row['vector_distance'] !== undefined
            ? parseFloat(String(row['vector_distance']))
            : null,
        name_score: parseFloat(String(row['d_name'])) || 0,
        matched_tags: (row['matched_tags'] as string[]) || [],
        matched_categories: (row['matched_categories'] as string[]) || [],
      };
      if (debug) {
        r.score_breakdown = {
          semantic: parseFloat(String(row['d_semantic'])) || 0,
          tag: parseFloat(String(row['d_tag'])) || 0,
          name: parseFloat(String(row['d_name'])) || 0,
          category_match: parseFloat(String(row['d_cat'])) || 0,
          rating: parseFloat(String(row['d_rating'])) || 0,
          strategy: strategy.name,
        };
      }
      return r;
    });
  }

  private async logSearch(
    rawQuery: string,
    parsed: { cleanQuery: string; capacity: number | null; timeContext: TimeContext | null },
    extraction: ExtractedQuery,
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
          intent: extraction.intent,
          possible_name: extraction.possible_name,
          categories: extraction.categories,
          tags: extraction.tags,
          excluded_tags: extraction.excluded_tags,
          location: extraction.location,
          require_high_rating: extraction.require_high_rating,
          confidence: extraction.confidence,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to log search: ${err}`);
    }
  }
}
