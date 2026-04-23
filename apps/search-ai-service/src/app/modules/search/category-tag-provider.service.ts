import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Tag } from '@mynook/database';

export interface PromptCategory {
  id: string;
  key: string;
  display_name: string;
  synonyms: string[];
  description: string | null;
}

export interface PromptTag {
  id: string;
  key: string;
  display_name: string;
  category: string | null;
}

interface CachedList<T> {
  data: T[];
  expiresAt: number;
}

/**
 * Loads active categories and the top-N most used tags. Results are cached
 * in-process for 5 minutes because the Groq prompt needs this list on every
 * uncached query and the lists change rarely.
 *
 * Also exposes by-key lookups so callers can validate AI-returned keys and
 * resolve them back to ids for SQL filtering.
 */
@Injectable()
export class CategoryTagProviderService {
  private readonly logger = new Logger(CategoryTagProviderService.name);
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly TOP_TAGS_LIMIT = 100;

  private categoriesCache: CachedList<PromptCategory> | null = null;
  private tagsCache: CachedList<PromptTag> | null = null;

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async getCategories(): Promise<PromptCategory[]> {
    const now = Date.now();
    if (this.categoriesCache && this.categoriesCache.expiresAt > now) {
      return this.categoriesCache.data;
    }
    const rows = await this.categoryRepo.find({
      where: { is_active: true },
      order: { display_order: 'ASC', display_name: 'ASC' },
    });
    const data = rows.map((r) => ({
      id: r.id,
      key: r.key,
      display_name: r.display_name,
      synonyms: r.synonyms ?? [],
      description: r.description,
    }));
    this.categoriesCache = { data, expiresAt: now + this.TTL_MS };
    return data;
  }

  async getTopTags(): Promise<PromptTag[]> {
    const now = Date.now();
    if (this.tagsCache && this.tagsCache.expiresAt > now) {
      return this.tagsCache.data;
    }
    // Pull top-N most-used tags; fall back to alphabetical if usage_count
    // hasn't been populated yet (migration 007 seeds it from venue_tags).
    const rows = await this.tagRepo
      .createQueryBuilder('t')
      .orderBy('t.usage_count', 'DESC')
      .addOrderBy('t.display_name', 'ASC')
      .limit(this.TOP_TAGS_LIMIT)
      .getMany();
    const data = rows.map((r) => ({
      id: r.id,
      key: r.key,
      display_name: r.display_name,
      category: r.category,
    }));
    this.tagsCache = { data, expiresAt: now + this.TTL_MS };
    return data;
  }

  /** Map an array of keys to matching category ids (unknown keys dropped) */
  async resolveCategoryIds(keys: string[]): Promise<string[]> {
    if (!keys.length) return [];
    const categories = await this.getCategories();
    const keySet = new Set(keys);
    return categories.filter((c) => keySet.has(c.key)).map((c) => c.id);
  }

  /** Map an array of keys to matching tag ids (unknown keys dropped) */
  async resolveTagIds(keys: string[]): Promise<string[]> {
    if (!keys.length) return [];
    // Use the cached top-N first; fall back to DB for long-tail keys not in cache.
    const topTags = await this.getTopTags();
    const resolved = new Map<string, string>();
    for (const t of topTags) {
      if (keys.includes(t.key)) resolved.set(t.key, t.id);
    }
    const missing = keys.filter((k) => !resolved.has(k));
    if (missing.length > 0) {
      const extra = await this.tagRepo
        .createQueryBuilder('t')
        .where('t.key IN (:...keys)', { keys: missing })
        .getMany();
      for (const t of extra) resolved.set(t.key, t.id);
    }
    return Array.from(resolved.values());
  }

  /** Force cache refresh (useful after admin edits) */
  invalidate(): void {
    this.categoriesCache = null;
    this.tagsCache = null;
    this.logger.debug('CategoryTagProvider cache invalidated');
  }
}
