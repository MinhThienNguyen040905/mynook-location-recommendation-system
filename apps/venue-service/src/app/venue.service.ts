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

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  /** Lấy tất cả venues của một owner */
  async findByOwner(ownerId: string): Promise<Venue[]> {
    return this.venueRepo.find({
      where: { owner_id: ownerId, is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  /** Lấy chi tiết venue theo ID */
  async findById(id: string): Promise<Venue> {
    const venue = await this.venueRepo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  /** Tạo venue mới (owner) */
  async create(ownerId: string, dto: CreateVenueDto): Promise<Venue> {
    const venue = this.venueRepo.create({
      ...dto,
      owner_id: ownerId,
    });
    return this.venueRepo.save(venue);
  }

  /** Cập nhật venue (chỉ owner sở hữu) */
  async update(
    venueId: string,
    ownerId: string,
    dto: UpdateVenueDto,
  ): Promise<Venue> {
    const venue = await this.findById(venueId);
    if (venue.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }
    Object.assign(venue, dto);
    return this.venueRepo.save(venue);
  }

  /** Xóa mềm venue (set is_active = false) */
  async remove(venueId: string, ownerId: string): Promise<void> {
    const venue = await this.findById(venueId);
    if (venue.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }
    venue.is_active = false;
    await this.venueRepo.save(venue);
  }
}
