import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '@mynook/database';
import { CreateVenueDto } from '../venue/dto/create-venue.dto.js';
import { UpdateVenueDto } from '../venue/dto/update-venue.dto.js';

export interface ListVenuesQuery {
  is_active?: boolean;
  is_community_contributed?: boolean;
  city?: string;
  district?: string;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminVenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  async list(query: ListVenuesQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.venueRepo
      .createQueryBuilder('v')
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
    if (query.city) qb.andWhere('v.city = :city', { city: query.city });
    if (query.district) {
      qb.andWhere('v.district = :district', { district: query.district });
    }
    if (query.q) {
      qb.andWhere('(v.name ILIKE :q OR v.address ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, page, limit, total };
  }

  async create(adminId: string, dto: CreateVenueDto) {
    const venue = this.venueRepo.create({
      ...dto,
      owner_id: adminId,
    });
    return this.venueRepo.save(venue);
  }

  async update(id: string, dto: UpdateVenueDto) {
    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    Object.assign(venue, dto);
    return this.venueRepo.save(venue);
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
      .where('v.is_active = true')
      .orderBy('v.review_count', 'DESC')
      .addOrderBy('v.rating_avg', 'DESC')
      .limit(10)
      .getMany();

    const popularAreas = await this.venueRepo
      .createQueryBuilder('v')
      .select('v.district', 'district')
      .addSelect('v.city', 'city')
      .addSelect('COUNT(v.id)', 'count')
      .addSelect('COALESCE(AVG(v.rating_avg), 0)', 'avg_rating')
      .where('v.is_active = true')
      .andWhere('v.district IS NOT NULL')
      .groupBy('v.district')
      .addGroupBy('v.city')
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
        city: v.city,
        district: v.district,
        rating_avg: v.rating_avg,
        review_count: v.review_count,
      })),
      popular_areas: popularAreas.map((r) => ({
        district: r.district,
        city: r.city,
        count: Number(r.count),
        avg_rating: Number(r.avg_rating),
      })),
    };
  }

  async cityBreakdown() {
    const rows = await this.venueRepo
      .createQueryBuilder('v')
      .select('v.city', 'city')
      .addSelect('COUNT(v.id)', 'count')
      .where('v.is_active = true')
      .groupBy('v.city')
      .orderBy('count', 'DESC')
      .getRawMany();
    return rows.map((r) => ({ city: r.city, count: Number(r.count) }));
  }
}
