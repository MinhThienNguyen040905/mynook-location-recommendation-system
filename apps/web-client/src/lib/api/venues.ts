import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { Venue, VenueSearchParams } from '@/types/venue';
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
