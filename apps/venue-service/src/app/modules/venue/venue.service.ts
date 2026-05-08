import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue, Category, VenueCategory } from '@mynook/database';
import { RMQ_EVENTS } from '@mynook/shared-types';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { CategoryService } from '../category/category.service.js';
import { VenueEmbeddingService } from './embedding.service.js';
import { VenueEventsService } from './venue-events.service.js';

export type VenueWithCategories = Venue & {
  categories: Array<Category & { is_primary: boolean }>;
  primary_category_id: string | null;
};

/**
 * Venue relations we always want eager-loaded for list/detail reads so the
 * frontend can render "Quận 1, TP.HCM" without extra round-trips.
 */
const WITH_LOCATION = {
  city_ref: true,
  district_ref: true,
} as const;

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly categoryService: CategoryService,
    private readonly embeddingService: VenueEmbeddingService,
    private readonly events: VenueEventsService,
  ) {}

  /**
   * Hydrate `venue.categories` (with `is_primary`) for a list of venues using
   * a single SQL pass. We don't use TypeORM's nested relation here because we
   * want the partial unique flag (is_primary) which lives on the junction.
   */
  private async attachCategories<T extends Venue>(venues: T[]): Promise<T[]> {
    if (venues.length === 0) return venues;
    const ids = venues.map((v) => v.id);
    const links = await this.venueRepo.manager
      .createQueryBuilder(VenueCategory, 'vc')
      .select('vc.venue_id', 'venue_id')
      .addSelect('vc.is_primary', 'is_primary')
      .addSelect('c.id', 'id')
      .addSelect('c.key', 'key')
      .addSelect('c.display_name', 'display_name')
      .addSelect('c.display_order', 'display_order')
      .innerJoin(Category, 'c', 'c.id = vc.category_id')
      .where('vc.venue_id = ANY(:ids)', { ids })
      .orderBy('vc.is_primary', 'DESC')
      .addOrderBy('c.display_order', 'ASC')
      .getRawMany();

    const byVenue = new Map<string, unknown[]>();
    for (const r of links) {
      const arr = byVenue.get(r.venue_id) ?? [];
      arr.push({
        id: r.id,
        key: r.key,
        display_name: r.display_name,
        display_order: Number(r.display_order),
        is_primary: r.is_primary === true || r.is_primary === 't',
        synonyms: [],
        description: null,
        is_active: true,
      });
      byVenue.set(r.venue_id, arr);
    }
    for (const v of venues) {
      (v as unknown as { categories: unknown[] }).categories =
        byVenue.get(v.id) ?? [];
    }
    return venues;
  }

  async findAll(): Promise<Venue[]> {
    const venues = await this.venueRepo.find({
      where: { is_active: true },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
    return this.attachCategories(venues);
  }

  /**
   * Top venues by recent activity. We rank by `rating_avg * log10(recent_review_count + 1.5)`
   * so a quiet venue with a single 5-star review can't outrank a busy 4.5-star venue.
   * Cross-schema query — `interaction_schema.reviews` lives in the same DB.
   */
  async findTopRated(days = 7, limit = 6): Promise<Venue[]> {
    const safeDays = Math.max(1, Math.min(days, 90));
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const rows = await this.venueRepo.manager.query(
      `
      WITH recent_review_counts AS (
        SELECT venue_id, COUNT(*)::int AS recent_count
        FROM interaction_schema.reviews
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY venue_id
      )
      SELECT v.id
      FROM venue_schema.venues v
      LEFT JOIN recent_review_counts rrc ON rrc.venue_id = v.id
      WHERE v.is_active = true
        AND v.rating_avg >= 4.0
      ORDER BY (v.rating_avg * LN(COALESCE(rrc.recent_count, 0) + 1.5)) DESC,
               v.review_count DESC
      LIMIT $2
      `,
      [safeDays, safeLimit],
    );

    if (rows.length === 0) return [];
    const ids: string[] = rows.map((r: { id: string }) => r.id);
    const venues = await this.venueRepo.find({
      where: ids.map((id) => ({ id })),
      relations: WITH_LOCATION,
    });
    // Preserve SQL order (find() doesn't guarantee it).
    const order = new Map(ids.map((id, i) => [id, i]));
    venues.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return this.attachCategories(venues);
  }

  async findByOwner(ownerId: string): Promise<Venue[]> {
    const venues = await this.venueRepo.find({
      where: { owner_id: ownerId, is_active: true },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
    return this.attachCategories(venues);
  }

  async findByContributor(contributorId: string): Promise<Venue[]> {
    const venues = await this.venueRepo.find({
      where: {
        contributed_by: contributorId,
        is_community_contributed: true,
        is_active: true,
      },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
    return this.attachCategories(venues);
  }

  async findById(id: string): Promise<VenueWithCategories> {
    const venue = await this.venueRepo.findOne({
      where: { id },
      relations: WITH_LOCATION,
    });
    if (!venue) throw new NotFoundException('Venue not found');
    const categories = await this.categoryService.getCategoriesForVenue(id);
    const primary = categories.find((c) => c.is_primary) ?? null;
    return Object.assign(venue, {
      categories,
      primary_category_id: primary?.id ?? null,
    });
  }

  async create(ownerId: string, dto: CreateVenueDto): Promise<Venue> {
    const { category_ids, primary_category_id, ...venueDto } = dto;
    const venue = this.venueRepo.create({
      ...venueDto,
      owner_id: ownerId,
    });
    const saved = await this.venueRepo.save(venue);
    if (category_ids && category_ids.length > 0) {
      await this.categoryService.setCategoriesForVenue(
        saved.id,
        category_ids,
        primary_category_id,
      );
    }
    this.embeddingService.regenerateInBackground(saved.id);
    this.events.emitDescribed(RMQ_EVENTS.VENUE_CREATED, {
      venueId: saved.id,
      name: saved.name,
      branchName: saved.branch_name ?? null,
      description: saved.description ?? null,
    });
    return saved;
  }

  async createCommunity(
    contributorId: string,
    dto: CreateVenueDto,
  ): Promise<Venue> {
    const { category_ids, primary_category_id, ...venueDto } = dto;
    const venue = this.venueRepo.create({
      ...venueDto,
      owner_id: contributorId,
      is_community_contributed: true,
      contributed_by: contributorId,
    });
    const saved = await this.venueRepo.save(venue);
    if (category_ids && category_ids.length > 0) {
      await this.categoryService.setCategoriesForVenue(
        saved.id,
        category_ids,
        primary_category_id,
      );
    }
    this.embeddingService.regenerateInBackground(saved.id);
    this.events.emitDescribed(RMQ_EVENTS.VENUE_CREATED, {
      venueId: saved.id,
      name: saved.name,
      branchName: saved.branch_name ?? null,
      description: saved.description ?? null,
    });
    return saved;
  }

  async update(
    venueId: string,
    userId: string,
    dto: UpdateVenueDto,
  ): Promise<Venue> {
    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');

    if (!venue.is_community_contributed && venue.owner_id !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }

    const { category_ids, primary_category_id, ...venueDto } = dto;
    Object.assign(venue, venueDto);
    const saved = await this.venueRepo.save(venue);

    if (category_ids !== undefined) {
      await this.categoryService.setCategoriesForVenue(
        venueId,
        category_ids,
        primary_category_id,
      );
    }
    // Only re-embed when fields that affect search_document actually changed.
    if (this.isSearchRelevantChange(dto)) {
      this.embeddingService.regenerateInBackground(saved.id);
    }
    // Re-seed description tags only when the owner actually edited the
    // description field. The consumer's upsert is idempotent so over-emitting
    // is safe, but skipping unrelated PATCHes (e.g. opening_hours) avoids
    // burning Groq quota.
    if (dto.description !== undefined) {
      this.events.emitDescribed(RMQ_EVENTS.VENUE_UPDATED, {
        venueId: saved.id,
        name: saved.name,
        branchName: saved.branch_name ?? null,
        description: saved.description ?? null,
      });
    }
    return saved;
  }

  /** Fields whose change invalidates the embedding / search_document */
  private isSearchRelevantChange(dto: UpdateVenueDto): boolean {
    return (
      dto.name !== undefined ||
      dto.branch_name !== undefined ||
      dto.description !== undefined ||
      dto.address_line !== undefined ||
      dto.ward !== undefined ||
      dto.city_id !== undefined ||
      dto.district_id !== undefined
    );
  }

  async remove(venueId: string, ownerId: string): Promise<void> {
    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    if (venue.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }
    venue.is_active = false;
    await this.venueRepo.save(venue);
  }
}
