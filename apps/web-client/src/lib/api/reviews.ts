import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { Review, CreateReviewRequest, UserReviewListResponse } from '@/types/review';

/** Lấy danh sách reviews của một venue (client-side) */
export async function getVenueReviews(venueId: string): Promise<Review[]> {
  const { data } = await apiClient.get<Review[]>(API_ENDPOINTS.REVIEWS.LIST(venueId));
  return data;
}

/** Tạo review mới (client-side, cần auth) */
export async function createReview(body: CreateReviewRequest): Promise<Review> {
  const { data } = await apiClient.post<Review>(API_ENDPOINTS.REVIEWS.CREATE, body);
  return data;
}

export async function getMyReviews(limit = 20): Promise<UserReviewListResponse> {
  const { data } = await apiClient.get<UserReviewListResponse>(
    API_ENDPOINTS.REVIEWS.MY,
    { params: { limit } },
  );
  return data;
}

/** Lấy danh sách reviews trên Server Component (cache 60s) */
export async function getVenueReviewsServer(venueId: string): Promise<Review[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REVIEWS.LIST(venueId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Failed to load venue reviews: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Failed to load venue reviews:', error);
    return [];
  }
}
