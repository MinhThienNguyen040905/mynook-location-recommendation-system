import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { VenueCategory } from '@/types/venue';

/** List active venue categories (cafe, restaurant, hotpot, ...) */
export async function listCategories(): Promise<VenueCategory[]> {
  const { data } = await apiClient.get<VenueCategory[]>(
    API_ENDPOINTS.CATEGORIES.LIST,
  );
  return data;
}

export async function getCategoryById(id: string): Promise<VenueCategory> {
  const { data } = await apiClient.get<VenueCategory>(
    API_ENDPOINTS.CATEGORIES.DETAIL(id),
  );
  return data;
}
