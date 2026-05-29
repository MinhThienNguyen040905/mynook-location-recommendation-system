import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavorite } from '@mynook/database';

export interface FavoriteVenue {
  venue_id: string;
  favorited_at: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  address_line: string | null;
  ward: string | null;
  city_id: string | null;
  district_id: string | null;
  city_name: string | null;
  district_name: string | null;
  latitude: number;
  longitude: number;
  media: string[];
  rating_avg: number;
  review_count: number;
  total_capacity: number;
  current_crowd_level: string;
  is_community_contributed: boolean;
  primary_category_id: string | null;
  primary_category_key: string | null;
  primary_category_name: string | null;
  categories: Array<{ id: string; key: string; display_name: string; is_primary: boolean }>;
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(UserFavorite)
    private readonly favRepo: Repository<UserFavorite>,
  ) {}

  /** Toàn bộ venue user đã đánh dấu yêu thích (mới nhất trước) */
  async list(accountId: string): Promise<FavoriteVenue[]> {
    const rows = await this.favRepo.manager.query(
      `
      SELECT
        f.venue_id,
        f.created_at AS favorited_at,
        v.name,
        v.branch_name,
        v.description,
        v.address_line,
        v.ward,
        v.city_id,
        v.district_id,
        v.latitude,
        v.longitude,
        v.media,
        v.rating_avg,
        v.review_count,
        v.total_capacity,
        v.current_crowd_level,
        v.is_community_contributed,
        c.name AS city_name,
        d.name AS district_name,
        pc.id  AS primary_category_id,
        pc.key AS primary_category_key,
        pc.display_name AS primary_category_name,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', cat.id,
              'key', cat.key,
              'display_name', cat.display_name,
              'is_primary', vc.is_primary
            ) ORDER BY vc.is_primary DESC, cat.display_name)
            FROM venue_schema.venue_categories vc
            JOIN venue_schema.categories cat ON cat.id = vc.category_id
            WHERE vc.venue_id = v.id
          ),
          '[]'::json
        ) AS categories
      FROM interaction_schema.user_favorites f
      JOIN venue_schema.venues v ON v.id = f.venue_id AND v.is_active = true
      LEFT JOIN venue_schema.cities c ON c.id = v.city_id
      LEFT JOIN venue_schema.districts d ON d.id = v.district_id
      LEFT JOIN LATERAL (
        SELECT cat.id, cat.key, cat.display_name
        FROM venue_schema.venue_categories vc
        JOIN venue_schema.categories cat ON cat.id = vc.category_id
        WHERE vc.venue_id = v.id AND vc.is_primary = true
        LIMIT 1
      ) pc ON true
      WHERE f.account_id = $1
      ORDER BY f.created_at DESC
      `,
      [accountId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      venue_id: r.venue_id as string,
      favorited_at: (r.favorited_at as Date).toISOString(),
      name: r.name as string,
      branch_name: r.branch_name as string | null,
      description: r.description as string | null,
      address_line: r.address_line as string | null,
      ward: r.ward as string | null,
      city_id: r.city_id as string | null,
      district_id: r.district_id as string | null,
      city_name: r.city_name as string | null,
      district_name: r.district_name as string | null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      media: (r.media as string[]) ?? [],
      rating_avg: Number(r.rating_avg ?? 0),
      review_count: Number(r.review_count ?? 0),
      total_capacity: Number(r.total_capacity ?? 0),
      current_crowd_level: r.current_crowd_level as string,
      is_community_contributed: Boolean(r.is_community_contributed),
      primary_category_id: r.primary_category_id as string | null,
      primary_category_key: r.primary_category_key as string | null,
      primary_category_name: r.primary_category_name as string | null,
      categories: (r.categories as FavoriteVenue['categories']) ?? [],
    }));
  }

  /** Danh sách venue_id user đã yêu thích (cho FE quyết định trạng thái nút Heart) */
  async listIds(accountId: string): Promise<string[]> {
    const rows = await this.favRepo.find({
      where: { account_id: accountId },
      select: { venue_id: true },
    });
    return rows.map((r) => r.venue_id);
  }

  async add(accountId: string, venueId: string): Promise<{ ok: true }> {
    await this.favRepo.manager.query(
      `
      INSERT INTO interaction_schema.user_favorites (account_id, venue_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (account_id, venue_id) DO NOTHING
      `,
      [accountId, venueId],
    );
    return { ok: true };
  }

  async remove(accountId: string, venueId: string): Promise<{ ok: true }> {
    await this.favRepo.delete({ account_id: accountId, venue_id: venueId });
    return { ok: true };
  }
}
