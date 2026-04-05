import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { Venue, VenueSearchParams, CreateVenueRequest } from '@/types/venue';
import type { PaginatedResponse } from '@/types/api';

// ─── Client-side fetchers (dùng trong 'use client' component + React Query) ──

/** Lấy danh sách địa điểm (có phân trang) */
export async function getVenues(params?: VenueSearchParams): Promise<PaginatedResponse<Venue>> {
  const { data } = await apiClient.get<PaginatedResponse<Venue>>(API_ENDPOINTS.VENUES.LIST, {
    params,
  });
  return data;
}

/** Lấy chi tiết một địa điểm theo id */
export async function getVenueById(id: string): Promise<Venue> {
  const { data } = await apiClient.get<Venue>(API_ENDPOINTS.VENUES.DETAIL(id));
  return data;
}

/** Tìm kiếm semantic (AI) */
export async function searchVenues(params: VenueSearchParams): Promise<PaginatedResponse<Venue>> {
  const { data } = await apiClient.get<PaginatedResponse<Venue>>(API_ENDPOINTS.VENUES.SEARCH, {
    params,
  });
  return data;
}

/** Lấy địa điểm gần vị trí hiện tại */
export async function getNearbyVenues(
  lat: number,
  lng: number,
  radius?: number
): Promise<Venue[]> {
  const { data } = await apiClient.get<Venue[]>(API_ENDPOINTS.VENUES.NEARBY, {
    params: { latitude: lat, longitude: lng, radius },
  });
  return data;
}

/** Lấy địa điểm trending (dùng cho trang chủ) */
export async function getTrendingVenues(): Promise<Venue[]> {
  const { data } = await apiClient.get<Venue[]>(API_ENDPOINTS.VENUES.TRENDING);
  return data;
}

// ─── Owner venue management ─────────────────────────────────────────────────

/** Lấy danh sách venues của owner đang đăng nhập */
export async function getMyVenues(): Promise<Venue[]> {
  const { data } = await apiClient.get<Venue[]>(API_ENDPOINTS.OWNER.MY_VENUES);
  return data;
}

/** Tạo venue mới */
export async function createVenue(body: CreateVenueRequest): Promise<Venue> {
  const { data } = await apiClient.post<Venue>(API_ENDPOINTS.VENUES.LIST, body);
  return data;
}

/** Cập nhật venue */
export async function updateVenue(id: string, body: Partial<Venue>): Promise<Venue> {
  const { data } = await apiClient.patch<Venue>(API_ENDPOINTS.VENUES.DETAIL(id), body);
  return data;
}

/** Xóa venue (soft delete) */
export async function deleteVenue(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.VENUES.DETAIL(id));
}

// ─── Server-side fetchers (dùng trong Server Component với fetch thuần) ──────
// Không dùng axios — Next.js fetch() có built-in caching và revalidation.

/** Lấy chi tiết địa điểm trên Server Component (có cache 60s) */
export async function getVenueByIdServer(id: string): Promise<Venue | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VENUES.DETAIL(id)}`, {
      next: { revalidate: 60 }, // ISR: cache 60 giây
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Lấy trending venues trên Server Component (cache 5 phút) */
export async function getTrendingVenuesServer(): Promise<Venue[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VENUES.TRENDING}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
