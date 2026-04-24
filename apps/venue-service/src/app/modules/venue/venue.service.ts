import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '@mynook/database';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { CategoryService } from '../category/category.service.js';

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
  ) {}

  async findAll(): Promise<Venue[]> {
    return this.venueRepo.find({
      where: { is_active: true },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
  }

  async findByOwner(ownerId: string): Promise<Venue[]> {
    return this.venueRepo.find({
      where: { owner_id: ownerId, is_active: true },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
  }

  async findByContributor(contributorId: string): Promise<Venue[]> {
    return this.venueRepo.find({
      where: {
        contributed_by: contributorId,
        is_community_contributed: true,
        is_active: true,
      },
      relations: WITH_LOCATION,
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<Venue & { categories: unknown[] }> {
    const venue = await this.venueRepo.findOne({
      where: { id },
      relations: WITH_LOCATION,
    });
    if (!venue) throw new NotFoundException('Venue not found');
    const categories = await this.categoryService.getCategoriesForVenue(id);
    return Object.assign(venue, { categories });
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
    return saved;
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
