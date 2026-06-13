import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type {
  Review,
  ReviewComment,
  ReviewReaction,
  ReviewReactionSummary,
  CreateReviewRequest,
  UserReviewListResponse,
} from '@/types/review';

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

export async function setReviewReaction(
  reviewId: string,
  reaction: ReviewReaction | null,
): Promise<ReviewReactionSummary> {
  const { data } = await apiClient.post<ReviewReactionSummary>(
    API_ENDPOINTS.REVIEWS.REACTION(reviewId),
    { reaction },
  );
  return data;
}

export async function createReviewComment(
  reviewId: string,
  body: { content: string; parent_comment_id?: string | null; media?: string[] },
): Promise<ReviewComment> {
  const { data } = await apiClient.post<ReviewComment>(
    API_ENDPOINTS.REVIEWS.COMMENTS(reviewId),
    body,
  );
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
