import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { City, District } from '@/types/venue';

/** List active cities (TP.HCM, Hà Nội, Đà Nẵng, ...) */
export async function listCities(): Promise<City[]> {
  const { data } = await apiClient.get<City[]>(API_ENDPOINTS.LOCATIONS.CITIES);
  return data;
}

export async function getCityById(id: string): Promise<City> {
  const { data } = await apiClient.get<City>(
    API_ENDPOINTS.LOCATIONS.CITY_DETAIL(id),
  );
  return data;
}

/** List districts, optionally filtered by city_id */
export async function listDistricts(cityId?: string): Promise<District[]> {
  const { data } = await apiClient.get<District[]>(
    API_ENDPOINTS.LOCATIONS.DISTRICTS,
    { params: cityId ? { city_id: cityId } : undefined },
  );
  return data;
}

export async function getDistrictById(id: string): Promise<District> {
  const { data } = await apiClient.get<District>(
    API_ENDPOINTS.LOCATIONS.DISTRICT_DETAIL(id),
  );
  return data;
}
