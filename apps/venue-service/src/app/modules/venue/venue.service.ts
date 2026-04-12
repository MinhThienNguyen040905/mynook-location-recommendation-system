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

  /** Lấy tất cả venues đang active */
  async findAll(): Promise<Venue[]> {
    return this.venueRepo.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

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

  /** Tạo venue mới (owner — venue thuộc quyền quản lý của owner) */
  async create(ownerId: string, dto: CreateVenueDto): Promise<Venue> {
    const venue = this.venueRepo.create({
      ...dto,
      owner_id: ownerId,
    });
    return this.venueRepo.save(venue);
  }

  /**
   * Tạo venue do cộng đồng đóng góp (customer).
   * Venue KHÔNG thuộc quyền quản lý của ai — ai cũng có thể cập nhật.
   * owner_id được set = contributorId nhưng is_community_contributed = true.
   */
  async createCommunity(
    contributorId: string,
    dto: CreateVenueDto,
  ): Promise<Venue> {
    const venue = this.venueRepo.create({
      ...dto,
      owner_id: contributorId, // placeholder — not a real owner
      is_community_contributed: true,
      contributed_by: contributorId,
    });
    return this.venueRepo.save(venue);
  }

  /**
   * Cập nhật venue.
   * - Nếu venue thuộc owner (is_community_contributed = false): chỉ owner sở hữu mới update được.
   * - Nếu venue do cộng đồng đóng góp (is_community_contributed = true): ai đăng nhập cũng update được.
   */
  async update(
    venueId: string,
    userId: string,
    dto: UpdateVenueDto,
  ): Promise<Venue> {
    const venue = await this.findById(venueId);

    if (!venue.is_community_contributed && venue.owner_id !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }

    Object.assign(venue, dto);
    return this.venueRepo.save(venue);
  }

  /** Xóa mềm venue (set is_active = false) — chỉ owner hoặc admin */
  async remove(venueId: string, ownerId: string): Promise<void> {
    const venue = await this.findById(venueId);
    if (venue.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }
    venue.is_active = false;
    await this.venueRepo.save(venue);
  }
}
