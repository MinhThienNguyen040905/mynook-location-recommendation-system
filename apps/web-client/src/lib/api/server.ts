import 'server-only';
import { API_BASE_URL } from '@/config/api';
import type { Venue } from '@/types/venue';
import type { Review } from '@/types/review';

async function read(path: string) {
  if (API_BASE_URL.startsWith('/')) {
    const { readPublicApi } = await import('@mynook/serverless-api');
    return readPublicApi(`${API_BASE_URL}${path}`);
  }
  return fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store', signal: AbortSignal.timeout(30_000),
  });
}

export async function getVenueByIdServer(id: string): Promise<Venue | null> {
  const response = await read(`/venues/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Không thể tải địa điểm. Vui lòng thử lại.');
  return response.json();
}

export async function getAllVenuesServer(): Promise<Venue[]> {
  const response = await read('/venues');
  if (!response.ok) throw new Error('Không thể tải danh sách địa điểm.');
  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function getTopRatedVenuesServer(days = 7, limit = 6): Promise<Venue[]> {
  const response = await read(`/venues/top-rated?days=${days}&limit=${limit}`);
  if (!response.ok) throw new Error('Không thể tải địa điểm nổi bật.');
  return response.json();
}

export async function getVenueReviewsServer(id: string): Promise<Review[]> {
  const response = await read(`/reviews/venue/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Không thể tải đánh giá.');
  return response.json();
}
