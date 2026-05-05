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
import { LocationResolverService } from './location-resolver.service.js';

export interface SearchResult {
  id: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  /** Composed display address: "<address_line>, <ward>, <district>, <city>" */
  address: string;
  address_line: string | null;
  ward: string | null;
  city_id: string | null;
  city: string | null;
  district_id: string | null;
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
  /** Metres from query location — only set when user provided coords */
  distance_m: number | null;
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
  location: number;
  strategy: string;
}

interface SearchStrategy {
  name: string;
  nameW: number;
  semW: number;
  tagW: number;
  categoryBoost: number;
  ratingW: number;
  locationW: number;
  applyCategoryHardFilter: boolean;
  applyRatingHardFilter: boolean;
  minNameScore: number | null;
  /**
   * When false, the city/district FK filter and `ST_DWithin` bounding box are
   * dropped from the WHERE clause. Used by the relaxation fallback so a
   * geo-specific query that yields zero results in the resolved area still
   * surfaces nearby alternatives (proximity is preserved via locationW boost).
   */
  applyLocationHardFilter: boolean;
}

export interface HybridSearchOptions {
  query: string;
  accountId?: string;
  limit?: number;
  offset?: number;
  debug?: boolean;
  /** Optional GPS from the caller; enables distance ranking + "nearby" boost */
  userLat?: number;
  userLng?: number;
  /** If set, restrict to venues within this many metres of the user point */
  maxDistanceM?: number;
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
    private readonly locationResolver: LocationResolverService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  async hybridSearch(opts: HybridSearchOptions): Promise<SearchResult[]> {
    const {
      query,
      accountId,
      limit = 20,
      offset = 0,
      debug = false,
      userLat,
      userLng,
      maxDistanceM,
    } = opts;

    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const parsed = this.parser.parse(trimmed);

    const [extraction, embedResult] = await Promise.all([
      this.queryExtractor.extract(trimmed),
      this.safeEmbed(parsed.cleanQuery || trimmed),
    ]);

    const timeContext = parsed.timeContext ?? extraction.time_context;

    // Resolve extracted text location → exact ids (parallel with other lookups)
    const [matchedCategoryIds, matchedTagIds, excludedTagIds, resolvedLocation] =
      await Promise.all([
        this.provider.resolveCategoryIds(extraction.categories),
        this.provider.resolveTagIds(extraction.tags),
        this.provider.resolveTagIds(extraction.excluded_tags),
        this.locationResolver.resolve(extraction.location),
      ]);

    const strategy = this.buildStrategy(extraction, userLat !== undefined);

    this.logger.log(
      `q="${trimmed}" intent=${extraction.intent} conf=${extraction.confidence} ` +
        `name="${extraction.possible_name ?? ''}" cats=${extraction.categories.length} ` +
        `tags=${extraction.tags.length} excl=${extraction.excluded_tags.length} ` +
        `city=${resolvedLocation.city_id ?? '-'} dist=${resolvedLocation.district_id ?? '-'}`,
    );

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
      cityId: resolvedLocation.city_id,
      districtId: resolvedLocation.district_id,
      userLat,
      userLng,
      maxDistanceM,
      limit,
      offset,
      debug,
    });

    const hasGeoFilter =
      !!resolvedLocation.city_id ||
      !!resolvedLocation.district_id ||
      maxDistanceM !== undefined;

    if (
      results.length < this.MIN_RESULTS_BEFORE_FALLBACK &&
      (strategy.applyCategoryHardFilter ||
        strategy.applyRatingHardFilter ||
        strategy.minNameScore !== null ||
        hasGeoFilter)
    ) {
      this.logger.log(
        `Only ${results.length} results with strict strategy; relaxing filters (geo=${hasGeoFilter})`,
      );
      const relaxed: SearchStrategy = {
        ...strategy,
        applyCategoryHardFilter: false,
        applyRatingHardFilter: false,
        minNameScore: null,
        applyLocationHardFilter: false,
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
        cityId: resolvedLocation.city_id,
        districtId: resolvedLocation.district_id,
        userLat,
        userLng,
        maxDistanceM,
        limit,
        offset,
        debug,
      });
    }

    this.logSearch(trimmed, parsed, extraction, resolvedLocation, accountId).catch(
      () => {},
    );

    return results;
  }

  // ── Strategy selection ───────────────────────────────────────────

  private buildStrategy(
    ext: ExtractedQuery,
    hasUserCoords: boolean,
  ): SearchStrategy {
    // When user provides GPS coords, reserve ~0.1 weight for distance ranking
    // by stealing from semantic. Without coords, locationW stays 0.
    const locationW = hasUserCoords ? 0.1 : 0;

    switch (ext.intent) {
      case 'name':
        return {
          name: 'name',
          nameW: 0.7,
          semW: 0.1,
          tagW: 0.1,
          categoryBoost: 0,
          ratingW: 0.1 - locationW,
          locationW,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: 0.3,
          applyLocationHardFilter: true,
        };
      case 'attribute':
        return {
          name: 'attribute',
          nameW: 0,
          semW: 0.4 - locationW,
          tagW: 0.4,
          categoryBoost: 0.1,
          ratingW: 0.1,
          locationW,
          applyCategoryHardFilter:
            ext.confidence === 'high' && ext.categories.length > 0,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: null,
          applyLocationHardFilter: true,
        };
      case 'mixed':
        return {
          name: 'mixed',
          nameW: 0.4,
          semW: 0.2 - locationW,
          tagW: 0.2,
          categoryBoost: 0.1,
          ratingW: 0.1,
          locationW,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: ext.require_high_rating,
          minNameScore: null,
          applyLocationHardFilter: true,
        };
      case 'unclear':
      default:
        return {
          name: 'unclear',
          nameW: 0.2,
          semW: 0.5 - locationW,
          tagW: 0.2,
          categoryBoost: 0,
          ratingW: 0.1,
          locationW,
          applyCategoryHardFilter: false,
          applyRatingHardFilter: false,
          minNameScore: null,
          applyLocationHardFilter: true,
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
    cityId: string | null;
    districtId: string | null;
    userLat?: number;
    userLng?: number;
    maxDistanceM?: number;
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
      cityId,
      districtId,
      userLat,
      userLng,
      maxDistanceM,
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

    // Semantic score expression — NULL-safe
    let semanticExpr = '0';
    let vectorDistExpr = 'NULL::float';
    if (queryVector) {
      const vec = p(this.embedding.toPgVector(queryVector));
      vectorDistExpr = `CASE WHEN v.embedding IS NULL THEN NULL ELSE (v.embedding <=> ${vec}::vector) END`;
      semanticExpr = `CASE WHEN v.embedding IS NULL THEN 0 ELSE (1 - LEAST(v.embedding <=> ${vec}::vector, 1.0)) END`;
    }

    // Matched-tag score — SUM only of tags the query mentions, time-frame filtered
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

    // Excluded-tag penalty
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

    // Category match flag (boost)
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

    // Matched category keys (display)
    const matchedCategoriesExpr = `(
      SELECT COALESCE(array_agg(c.key), ARRAY[]::text[])
      FROM venue_schema.venue_categories vc
      JOIN venue_schema.categories c ON c.id = vc.category_id
      WHERE vc.venue_id = v.id
    )`;

    // Matched tag keys for display (self-contained param)
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

    // Name similarity via f_unaccent wrapper (matches GIN index)
    let nameScoreExpr = '0';
    const name = extraction.possible_name;
    if (name) {
      const np = p(name);
      nameScoreExpr = `GREATEST(
        similarity(public.f_unaccent(lower(v.name)), public.f_unaccent(lower(${np}))),
        similarity(public.f_unaccent(lower(coalesce(v.branch_name, ''))), public.f_unaccent(lower(${np})))
      )`;
    }

    // Distance score: 1 at the user point, → 0 at 5km. Only when coords provided.
    let distanceScoreExpr = '0';
    let distanceMExpr = 'NULL::float';
    if (userLat !== undefined && userLng !== undefined) {
      const uLng = p(userLng);
      const uLat = p(userLat);
      const userPoint = `ST_SetSRID(ST_MakePoint(${uLng}, ${uLat}), 4326)::geography`;
      distanceMExpr = `CASE WHEN v.location IS NULL THEN NULL ELSE ST_Distance(v.location, ${userPoint}) END`;
      // Exponential decay: 1 / (1 + d / 1500) so ~0.5 at 1.5km, ~0.23 at 5km
      distanceScoreExpr = `CASE WHEN v.location IS NULL THEN 0 ELSE 1.0 / (1.0 + (ST_Distance(v.location, ${userPoint}) / 1500.0)) END`;
    }

    const normTagScore = `LEAST((${matchedTagScoreExpr}) / 3.0, 1.0)`;
    const normExcluded = `LEAST((${excludedTagPenaltyExpr}) / 3.0, 1.0)`;

    const combinedScore = `(
        ${strategy.semW} * (${semanticExpr})
      + ${strategy.tagW} * (${normTagScore})
      + ${strategy.nameW} * (${nameScoreExpr})
      + ${strategy.categoryBoost} * (${categoryMatchExpr})
      + ${strategy.ratingW} * (v.rating_avg / 5.0)
      + ${strategy.locationW} * (${distanceScoreExpr})
      - 0.15 * (${normExcluded})
    )`;

    // WHERE clauses
    const where: string[] = [
      'v.is_active = true',
      `v.current_crowd_level != 'full'`,
    ];
    if (minCapacity) where.push(`v.max_group_size >= ${p(minCapacity)}`);

    // Location hard filters — EXACT match via FK now that we resolved IDs.
    // Skipped when the relaxation fallback turned `applyLocationHardFilter` off
    // so a geo-specific query that returned 0 results in the strict pass can
    // surface nearby alternatives. Proximity is still preserved via locationW.
    if (strategy.applyLocationHardFilter) {
      if (cityId) where.push(`v.city_id = ${p(cityId)}`);
      if (districtId) where.push(`v.district_id = ${p(districtId)}`);
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

    // Street-level trigram fuzzy match on address_line (uses idx_venues_address_line_trgm)
    if (extraction.location.street) {
      const street = p(extraction.location.street.toLowerCase());
      where.push(
        `public.f_unaccent(lower(coalesce(v.address_line, ''))) ILIKE '%' || public.f_unaccent(${street}) || '%'`,
      );
    }

    // Bounding-box max distance filter — also dropped during relaxation.
    if (
      strategy.applyLocationHardFilter &&
      userLat !== undefined &&
      userLng !== undefined &&
      maxDistanceM !== undefined
    ) {
      const uLng2 = p(userLng);
      const uLat2 = p(userLat);
      const maxD = p(maxDistanceM);
      where.push(
        `ST_DWithin(v.location, ST_SetSRID(ST_MakePoint(${uLng2}, ${uLat2}), 4326)::geography, ${maxD})`,
      );
    }

    // Pure-text fallback only when we have nothing else
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
        v.id, v.name, v.branch_name, v.description,
        v.address_line, v.ward,
        v.city_id, v.district_id,
        city.name AS city_name,
        district.name AS district_name,
        v.latitude, v.longitude, v.media,
        v.max_group_size, v.is_group_friendly,
        v.current_crowd_level, v.rating_avg, v.review_count, v.opening_hours,
        ${vectorDistExpr} AS vector_distance,
        ${distanceMExpr} AS distance_m,
        (${semanticExpr}) AS d_semantic,
        (${normTagScore}) AS d_tag,
        (${nameScoreExpr}) AS d_name,
        (${categoryMatchExpr})::float AS d_cat,
        (v.rating_avg / 5.0) AS d_rating,
        (${distanceScoreExpr}) AS d_loc,
        ${combinedScore} AS relevance_score,
        ${matchedTagsKeysExpr} AS matched_tags,
        ${matchedCategoriesExpr} AS matched_categories
      FROM venue_schema.venues v
      LEFT JOIN venue_schema.cities city ON city.id = v.city_id
      LEFT JOIN venue_schema.districts district ON district.id = v.district_id
      WHERE ${where.join(' AND ')}
      ORDER BY relevance_score DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((row: Record<string, unknown>) => {
      const city = (row['city_name'] as string | null) ?? null;
      const district = (row['district_name'] as string | null) ?? null;
      const addressLine = (row['address_line'] as string | null) ?? null;
      const ward = (row['ward'] as string | null) ?? null;
      const address = [addressLine, ward, district, city]
        .filter((s) => !!s)
        .join(', ');

      const r: SearchResult = {
        id: row['id'] as string,
        name: row['name'] as string,
        branch_name: row['branch_name'] as string | null,
        description: row['description'] as string | null,
        address,
        address_line: addressLine,
        ward,
        city_id: (row['city_id'] as string | null) ?? null,
        city,
        district_id: (row['district_id'] as string | null) ?? null,
        district,
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
        distance_m:
          row['distance_m'] !== null && row['distance_m'] !== undefined
            ? parseFloat(String(row['distance_m']))
            : null,
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
          location: parseFloat(String(row['d_loc'])) || 0,
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
    resolved: { city_id: string | null; district_id: string | null },
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
          location_text: extraction.location,
          resolved_city_id: resolved.city_id,
          resolved_district_id: resolved.district_id,
          require_high_rating: extraction.require_high_rating,
          confidence: extraction.confidence,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to log search: ${err}`);
    }
  }
}
