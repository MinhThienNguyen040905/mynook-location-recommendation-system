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

export interface InteractionStats {
  viewed_count: number;
}

export interface VenueInteractionAnalytics {
  venue: {
    id: string;
    name: string;
    branch_name: string | null;
    rating_avg: number;
    review_count: number;
  };
  summary: {
    unique_viewers: number;
    viewers_last_7d: number;
    favorites_count: number;
    reviews_count: number;
    average_rating: number;
    verified_reviews_count: number;
    review_likes: number;
    review_dislikes: number;
    review_comments: number;
    pending_reports: number;
    total_reports: number;
  };
  rating_distribution: Array<{ rating: number; count: number }>;
  recent_reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    created_at: string;
    author_name: string | null;
    like_count: number;
    dislike_count: number;
    comment_count: number;
  }>;
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

export async function getInteractionStats(): Promise<InteractionStats> {
  const { data } = await apiClient.get<InteractionStats>(
    API_ENDPOINTS.INTERACTIONS.STATS,
  );
  return data;
}

export async function getVenueInteractionAnalytics(
  venueId: string,
): Promise<VenueInteractionAnalytics> {
  const { data } = await apiClient.get<VenueInteractionAnalytics>(
    API_ENDPOINTS.INTERACTIONS.VENUE_ANALYTICS(venueId),
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
