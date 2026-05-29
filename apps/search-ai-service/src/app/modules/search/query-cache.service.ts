import { Injectable } from '@nestjs/common';
import type { ExtractedQuery } from './query-extraction.service.js';

interface CacheEntry {
  value: ExtractedQuery;
  expiresAt: number;
}

/**
 * LRU-ish in-memory cache for Groq query-extraction results, with a
 * single-flight guard that collapses concurrent identical requests onto
 * one in-flight Promise (stampede protection).
 *
 * Normalize key = lowercase + NFC + collapsed whitespace. This lets
 * "Quán Cà Phê  yên tĩnh" and "quán cà phê yên tĩnh" share a cache slot.
 */
@Injectable()
export class QueryCacheService {
  private readonly MAX_ENTRIES = 5000;
  private readonly TTL_MS = 60 * 60 * 1000;

  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<ExtractedQuery>>();

  private normalize(q: string): string {
    return q.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
  }

  get(query: string): ExtractedQuery | null {
    const key = this.normalize(query);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // LRU bump — re-insert to move to tail
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(query: string, value: ExtractedQuery): void {
    const key = this.normalize(query);
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.TTL_MS });
  }

  /**
   * Run `loader` only once for a given normalized query even if multiple
   * callers arrive concurrently. All callers await the same Promise and
   * receive the same result (then the result is cached).
   */
  async singleFlight(
    query: string,
    loader: () => Promise<ExtractedQuery>,
  ): Promise<ExtractedQuery> {
    const key = this.normalize(query);

    const cached = this.get(query);
    if (cached) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(query, value);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise);
    return promise;
  }
}
