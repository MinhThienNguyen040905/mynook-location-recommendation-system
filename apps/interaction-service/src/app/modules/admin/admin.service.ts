import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  Review,
  UserFavorite,
} from '@mynook/database';
import { BroadcastNotificationDto } from './dto/broadcast.dto.js';
import { ReviewService } from '../review/review.service.js';

export interface ListReviewsQuery {
  venue_id?: string;
  account_id?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminInteractionService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(UserFavorite)
    private readonly favRepo: Repository<UserFavorite>,
    private readonly reviewService: ReviewService,
  ) {}

  /* ── Review moderation ── */

  async listReviews(query: ListReviewsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.venue_id) qb.andWhere('r.venue_id = :vid', { vid: query.venue_id });
    if (query.account_id) {
      qb.andWhere('r.account_id = :aid', { aid: query.account_id });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, page, limit, total };
  }

  async deleteReview(reviewId: string) {
    await this.reviewService.delete(reviewId);
    return { message: 'Review deleted' };
  }

  /* ── Broadcast notifications ── */

  async broadcast(dto: BroadcastNotificationDto) {
    const type = dto.type ?? NotificationType.SYSTEM;

    const rows = dto.account_ids.map((accountId) => ({
      account_id: accountId,
      title: dto.title,
      message: dto.message,
      type,
    }));

    // Chia batch 500 để tránh parameter limit của Postgres
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const res = await this.notifRepo.insert(chunk);
      inserted += res.identifiers.length;
    }

    return { inserted, total: rows.length };
  }

  /* ── Stats ── */

  async stats() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalReviews, reviewsLast30, favorites, unreadNotifs] =
      await Promise.all([
        this.reviewRepo.count(),
        this.reviewRepo.count({
          where: { created_at: MoreThanOrEqual(since) },
        }),
        this.favRepo.count(),
        this.notifRepo.count({ where: { is_read: false } }),
      ]);

    const avgRow = await this.reviewRepo
      .createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating), 0)', 'avg')
      .getRawOne<{ avg: string }>();

    return {
      total_reviews: totalReviews,
      reviews_last_30_days: reviewsLast30,
      total_favorites: favorites,
      unread_notifications: unreadNotifs,
      avg_rating: Number(avgRow?.avg ?? 0),
    };
  }
}
