import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { SearchResponse } from '@/types/venue';

/**
 * Hybrid search — calls /api/search (through api-gateway → search-ai-service).
 * Authenticated users get personalized search logging.
 */
export async function hybridSearch(
  query: string,
  limit = 20,
): Promise<SearchResponse> {
  const { data } = await apiClient.get<SearchResponse>(
    API_ENDPOINTS.SEARCH.SEMANTIC,
    { params: { q: query, limit } },
  );
  return data;
}

/**
 * Public hybrid search (no auth required).
 * Falls back to this when user is not logged in.
 */
export async function hybridSearchPublic(
  query: string,
  limit = 20,
): Promise<SearchResponse> {
  const res = await fetch(
    `${API_BASE_URL}/search/public?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
