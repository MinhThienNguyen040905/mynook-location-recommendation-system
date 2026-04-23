import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { Review, CreateReviewRequest } from '@/types/review';

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

/** Lấy danh sách reviews trên Server Component (cache 60s) */
export async function getVenueReviewsServer(venueId: string): Promise<Review[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REVIEWS.LIST(venueId)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
