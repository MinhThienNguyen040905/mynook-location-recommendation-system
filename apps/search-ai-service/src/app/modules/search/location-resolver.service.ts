import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ResolvedLocation {
  city_id: string | null;
  district_id: string | null;
}

interface CachedLookup {
  id: string;
  expiresAt: number;
}

/**
 * Resolves free-text locations (from Groq extraction) to concrete city/district
 * IDs via the `aliases` arrays + trigram fuzzy match. Results are cached
 * in-process for 10 minutes.
 *
 * Why both alias + trigram? Admin-curated aliases catch well-known short forms
 * ("Q1", "q.1", "quan 1") with perfect precision. Trigram with f_unaccent
 * catches typos ("quan 1 ", "quan1 ", accent variants) not in aliases.
 */
@Injectable()
export class LocationResolverService {
  private readonly logger = new Logger(LocationResolverService.name);
  private readonly TTL_MS = 10 * 60 * 1000;

  private cityCache = new Map<string, CachedLookup | null>();
  private districtCache = new Map<string, CachedLookup | null>();

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Resolve extracted Groq location object into exact DB IDs.
   * `cityId` is resolved first; district resolution is scoped to that city
   * when available (so "Quận 1" in Hà Nội search won't match HCM by mistake).
   */
  async resolve(input: {
    city: string | null;
    district: string | null;
  }): Promise<ResolvedLocation> {
    const city_id = input.city ? await this.resolveCity(input.city) : null;
    const district_id = input.district
      ? await this.resolveDistrict(input.district, city_id)
      : null;
    return { city_id, district_id };
  }

  async resolveCity(input: string): Promise<string | null> {
    const key = this.normalize(input);
    if (!key) return null;
    const cached = this.cityCache.get(key);
    if (cached !== undefined && (cached === null || cached.expiresAt > Date.now())) {
      return cached?.id ?? null;
    }

    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id
       FROM venue_schema.cities
       WHERE is_active = true
         AND (
           lower(name) = $1
           OR lower(code) = $1
           OR $1 = ANY(aliases)
           OR similarity(public.f_unaccent(lower(name)), public.f_unaccent($1)) > 0.55
         )
       ORDER BY CASE
         WHEN lower(name) = $1 THEN 0
         WHEN $1 = ANY(aliases) THEN 1
         WHEN lower(code) = $1 THEN 2
         ELSE 3
       END
       LIMIT 1`,
      [key],
    );

    const id = rows[0]?.id ?? null;
    this.cityCache.set(
      key,
      id ? { id, expiresAt: Date.now() + this.TTL_MS } : null,
    );
    return id;
  }

  async resolveDistrict(
    input: string,
    cityId: string | null,
  ): Promise<string | null> {
    const key = this.normalize(input);
    if (!key) return null;
    const cacheKey = `${cityId ?? '*'}::${key}`;
    const cached = this.districtCache.get(cacheKey);
    if (cached !== undefined && (cached === null || cached.expiresAt > Date.now())) {
      return cached?.id ?? null;
    }

    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id
       FROM venue_schema.districts
       WHERE is_active = true
         AND ($2::uuid IS NULL OR city_id = $2)
         AND (
           lower(name) = $1
           OR lower(code) = $1
           OR $1 = ANY(aliases)
           OR similarity(public.f_unaccent(lower(name)), public.f_unaccent($1)) > 0.55
         )
       ORDER BY CASE
         WHEN lower(name) = $1 THEN 0
         WHEN $1 = ANY(aliases) THEN 1
         WHEN lower(code) = $1 THEN 2
         ELSE 3
       END
       LIMIT 1`,
      [key, cityId],
    );

    const id = rows[0]?.id ?? null;
    this.districtCache.set(
      cacheKey,
      id ? { id, expiresAt: Date.now() + this.TTL_MS } : null,
    );
    return id;
  }

  invalidate(): void {
    this.cityCache.clear();
    this.districtCache.clear();
    this.logger.debug('LocationResolver cache cleared');
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
  }
}
