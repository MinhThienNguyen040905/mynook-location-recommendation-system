import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';

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
  categories: Array<{
    id: string;
    key: string;
    display_name: string;
    is_primary: boolean;
  }>;
}

export async function listFavorites(): Promise<FavoriteVenue[]> {
  const { data } = await apiClient.get<FavoriteVenue[]>(API_ENDPOINTS.FAVORITES.LIST);
  return data;
}

export async function listFavoriteIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ venue_ids: string[] }>(
    `${API_ENDPOINTS.FAVORITES.LIST}/ids`,
  );
  return data.venue_ids;
}

export async function addFavorite(venueId: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.FAVORITES.TOGGLE(venueId));
}

export async function removeFavorite(venueId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.FAVORITES.TOGGLE(venueId));
}
