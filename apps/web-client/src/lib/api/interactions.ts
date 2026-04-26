import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';

export interface RecentlyViewedVenue {
  venue_id: string;
  viewed_at: string;
  name: string;
  branch_name: string | null;
  address_line: string | null;
  ward: string | null;
  city_name: string | null;
  district_name: string | null;
  latitude: number;
  longitude: number;
  media: string[];
  rating_avg: number;
  review_count: number;
  current_crowd_level: string;
  primary_category_id: string | null;
  primary_category_key: string | null;
  primary_category_name: string | null;
}

export interface RecommendedVenue {
  id: string;
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
  current_crowd_level: string;
  is_community_contributed: boolean;
  is_active: boolean;
  primary_category_id: string | null;
  primary_category_key: string | null;
  primary_category_name: string | null;
  similarity: number;
}

/** Server-side: ghi nhận user vừa xem một venue. Yêu cầu auth. */
export async function trackVenueView(venueId: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.INTERACTIONS.TRACK_VIEW, {
    venue_id: venueId,
  });
}

/** Lấy danh sách "Recently Viewed" của user đang đăng nhập. */
export async function getRecentlyViewed(
  limit = 8,
): Promise<RecentlyViewedVenue[]> {
  const { data } = await apiClient.get<RecentlyViewedVenue[]>(
    API_ENDPOINTS.INTERACTIONS.RECENTLY_VIEWED,
    { params: { limit } },
  );
  return data;
}

/** Lấy "Recommended For You" cho user đang đăng nhập (rỗng nếu user chưa có signal). */
export async function getRecommended(limit = 6): Promise<RecommendedVenue[]> {
  const { data } = await apiClient.get<RecommendedVenue[]>(
    API_ENDPOINTS.SEARCH.RECOMMENDED,
    { params: { limit } },
  );
  return data;
}
