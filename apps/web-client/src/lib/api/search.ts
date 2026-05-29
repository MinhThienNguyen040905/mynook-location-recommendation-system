import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import type { SearchOptions, SearchResponse } from '@/types/venue';

function buildQueryParams(query: string, opts: SearchOptions = {}) {
  const params: Record<string, string | number> = { q: query };
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  if (opts.debug) params.debug = '1';
  if (opts.lat !== undefined) params.lat = opts.lat;
  if (opts.lng !== undefined) params.lng = opts.lng;
  if (opts.max_distance_m !== undefined) params.max_distance_m = opts.max_distance_m;
  return params;
}

/**
 * Hybrid search — calls /api/search (through api-gateway → search-ai-service).
 * Authenticated users get personalized search logging.
 *
 * Pass `lat`/`lng` (e.g. from useGeolocation) to enable PostGIS distance ranking,
 * and `max_distance_m` to bound the search to a radius.
 */
export async function hybridSearch(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchResponse> {
  const { data } = await apiClient.get<SearchResponse>(
    API_ENDPOINTS.SEARCH.SEMANTIC,
    { params: buildQueryParams(query, opts) },
  );
  return data;
}

/**
 * Public hybrid search (no auth required).
 * Falls back to this when user is not logged in.
 */
export async function hybridSearchPublic(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  const params = buildQueryParams(query, opts);
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const res = await fetch(`${API_BASE_URL}/search/public?${qs.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
