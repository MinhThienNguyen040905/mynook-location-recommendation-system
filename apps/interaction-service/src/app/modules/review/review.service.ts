import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '@mynook/database';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  /** Lấy danh sách reviews của một venue (mới nhất trước) */
  async findByVenue(venueId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { venue_id: venueId },
      order: { created_at: 'DESC' },
    });
  }

  /** Tạo review mới */
  async create(accountId: string, dto: CreateReviewDto): Promise<Review> {
    const review = this.reviewRepo.create({
      account_id: accountId,
      venue_id: dto.venue_id,
      rating: dto.rating,
      content: dto.content ?? null,
      media: dto.media ?? [],
    });
    return this.reviewRepo.save(review);
  }
}
