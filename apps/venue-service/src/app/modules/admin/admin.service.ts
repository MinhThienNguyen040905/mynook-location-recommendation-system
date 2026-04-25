import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '@mynook/database';
import { CreateVenueDto } from '../venue/dto/create-venue.dto.js';
import { UpdateVenueDto } from '../venue/dto/update-venue.dto.js';
import { CategoryService } from '../category/category.service.js';
import { VenueEmbeddingService } from '../venue/embedding.service.js';

export interface ListVenuesQuery {
  is_active?: boolean;
  is_community_contributed?: boolean;
  city_id?: string;
  district_id?: string;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminVenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly categoryService: CategoryService,
    private readonly embeddingService: VenueEmbeddingService,
  ) {}

  async list(query: ListVenuesQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.venueRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.city_ref', 'city')
      .leftJoinAndSelect('v.district_ref', 'district')
      .orderBy('v.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (typeof query.is_active === 'boolean') {
      qb.andWhere('v.is_active = :isActive', { isActive: query.is_active });
    }
    if (typeof query.is_community_contributed === 'boolean') {
      qb.andWhere('v.is_community_contributed = :cc', {
        cc: query.is_community_contributed,
      });
    }
    if (query.city_id) {
      qb.andWhere('v.city_id = :cityId', { cityId: query.city_id });
    }
    if (query.district_id) {
      qb.andWhere('v.district_id = :districtId', { districtId: query.district_id });
    }
    if (query.q) {
      qb.andWhere('(v.name ILIKE :q OR v.address_line ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, page, limit, total };
  }

  async create(adminId: string, dto: CreateVenueDto) {
    const { category_ids, primary_category_id, ...venueDto } = dto;
    const venue = this.venueRepo.create({
      ...venueDto,
      owner_id: adminId,
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
    return saved;
  }

  async update(id: string, dto: UpdateVenueDto) {
    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    const { category_ids, primary_category_id, ...venueDto } = dto;
    Object.assign(venue, venueDto);
    const saved = await this.venueRepo.save(venue);
    if (category_ids !== undefined) {
      await this.categoryService.setCategoriesForVenue(
        id,
        category_ids,
        primary_category_id,
      );
    }
    // Admin may tweak anything; always re-embed on admin update
    this.embeddingService.regenerateInBackground(saved.id);
    return saved;
  }

  async softDelete(id: string) {
    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    venue.is_active = false;
    await this.venueRepo.save(venue);
    return { message: 'Venue deactivated' };
  }

  async restore(id: string) {
    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    venue.is_active = true;
    await this.venueRepo.save(venue);
    return { message: 'Venue restored' };
  }

  async hardDelete(id: string) {
    const res = await this.venueRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Venue not found');
    return { message: 'Venue permanently deleted' };
  }

  async stats() {
    const [total, active, inactive, community] = await Promise.all([
      this.venueRepo.count(),
      this.venueRepo.count({ where: { is_active: true } }),
      this.venueRepo.count({ where: { is_active: false } }),
      this.venueRepo.count({
        where: { is_community_contributed: true, is_active: true },
      }),
    ]);

    const hot = await this.venueRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.city_ref', 'city')
      .leftJoinAndSelect('v.district_ref', 'district')
      .where('v.is_active = true')
      .orderBy('v.review_count', 'DESC')
      .addOrderBy('v.rating_avg', 'DESC')
      .limit(10)
      .getMany();

    // GROUP BY district_id / city_id instead of raw text — aliases now survive.
    const popularAreas = await this.venueRepo
      .createQueryBuilder('v')
      .select('d.id', 'district_id')
      .addSelect('d.name', 'district')
      .addSelect('c.id', 'city_id')
      .addSelect('c.name', 'city')
      .addSelect('COUNT(v.id)', 'count')
      .addSelect('COALESCE(AVG(v.rating_avg), 0)', 'avg_rating')
      .innerJoin('v.district_ref', 'd')
      .innerJoin('v.city_ref', 'c')
      .where('v.is_active = true')
      .groupBy('d.id')
      .addGroupBy('d.name')
      .addGroupBy('c.id')
      .addGroupBy('c.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      active,
      inactive,
      community_contributed: community,
      hot_venues: hot.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city_ref?.name ?? null,
        district: v.district_ref?.name ?? null,
        rating_avg: v.rating_avg,
        review_count: v.review_count,
      })),
      popular_areas: popularAreas.map((r) => ({
        district_id: r.district_id,
        district: r.district,
        city_id: r.city_id,
        city: r.city,
        count: Number(r.count),
        avg_rating: Number(r.avg_rating),
      })),
    };
  }

  /**
   * Re-generate search_document + embedding for venues that are missing them
   * (or all active venues if `force=true`). Synchronous — intended for a
   * one-shot admin action, not a loop.
   */
  async reindexEmbeddings(force = false, limit = 50) {
    const qb = this.venueRepo
      .createQueryBuilder('v')
      .select('v.id', 'id')
      .where('v.is_active = true');
    if (!force) qb.andWhere('v.embedding IS NULL');
    const rows = await qb.limit(Math.max(1, Math.min(limit, 200))).getRawMany();

    let ok = 0;
    let failed = 0;
    for (const r of rows) {
      try {
        await this.embeddingService.regenerate(r.id);
        ok++;
      } catch {
        failed++;
      }
    }
    return { processed: rows.length, ok, failed };
  }

  async cityBreakdown() {
    const rows = await this.venueRepo
      .createQueryBuilder('v')
      .select('c.id', 'city_id')
      .addSelect('c.name', 'city')
      .addSelect('COUNT(v.id)', 'count')
      .innerJoin('v.city_ref', 'c')
      .where('v.is_active = true')
      .groupBy('c.id')
      .addGroupBy('c.name')
      .orderBy('count', 'DESC')
      .getRawMany();
    return rows.map((r) => ({
      city_id: r.city_id,
      city: r.city,
      count: Number(r.count),
    }));
  }
}
