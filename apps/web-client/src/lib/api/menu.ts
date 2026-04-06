import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { MenuCategory, MenuItem } from '@/types/venue';

/* ── Categories ──────────────────────────────────────── */

export async function getCategories(venueId: string): Promise<MenuCategory[]> {
  const { data } = await apiClient.get<MenuCategory[]>(
    API_ENDPOINTS.MENU.CATEGORIES(venueId),
  );
  return data;
}

export async function createCategory(
  venueId: string,
  body: { name: string; display_order?: number },
): Promise<MenuCategory> {
  const { data } = await apiClient.post<MenuCategory>(
    API_ENDPOINTS.MENU.CATEGORIES(venueId),
    body,
  );
  return data;
}

export async function updateCategory(
  venueId: string,
  categoryId: string,
  body: { name?: string; display_order?: number },
): Promise<MenuCategory> {
  const { data } = await apiClient.patch<MenuCategory>(
    API_ENDPOINTS.MENU.CATEGORY(venueId, categoryId),
    body,
  );
  return data;
}

export async function deleteCategory(
  venueId: string,
  categoryId: string,
): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.MENU.CATEGORY(venueId, categoryId));
}

/* ── Items ───────────────────────────────────────────── */

export async function createMenuItem(
  venueId: string,
  body: { name: string; price: number; category_id: string; image_url?: string; is_available?: boolean },
): Promise<MenuItem> {
  const { data } = await apiClient.post<MenuItem>(
    API_ENDPOINTS.MENU.ITEMS(venueId),
    body,
  );
  return data;
}

export async function updateMenuItem(
  venueId: string,
  itemId: string,
  body: Partial<{ name: string; price: number; category_id: string; image_url: string; is_available: boolean }>,
): Promise<MenuItem> {
  const { data } = await apiClient.patch<MenuItem>(
    API_ENDPOINTS.MENU.ITEM(venueId, itemId),
    body,
  );
  return data;
}

export async function deleteMenuItem(
  venueId: string,
  itemId: string,
): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.MENU.ITEM(venueId, itemId));
}
