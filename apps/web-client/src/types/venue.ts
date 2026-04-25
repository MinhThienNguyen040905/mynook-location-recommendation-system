export type CrowdLevel = 'empty' | 'moderate' | 'crowded' | 'full';

// ── Location taxonomy (migration 008) ──────────────────────────────

export interface City {
  id: string;
  code: string;
  name: string;
  aliases: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  id: string;
  city_id: string;
  code: string;
  name: string;
  aliases: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Venue ──────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  owner_id: string;
  branch_name: string | null;
  name: string;
  description: string | null;
  /** Street-level address only, e.g. "123 Lê Lợi" */
  address_line: string | null;
  /** Phường/xã, e.g. "Phường Bến Nghé" */
  ward: string | null;
  city_id: string | null;
  district_id: string | null;
  /** Joined city reference from API (present when eager-loaded) */
  city_ref?: City | null;
  /** Joined district reference from API (present when eager-loaded) */
  district_ref?: District | null;
  latitude: number;
  longitude: number;
  media: string[];
  total_capacity: number;
  max_group_size: number;
  is_group_friendly: boolean;
  current_crowd_level: CrowdLevel;
  is_active: boolean;
  opening_hours: Record<string, { open: string; close: string }> | null;
  menu_image_url: string | null;
  rating_avg: number;
  review_count: number;
  is_community_contributed: boolean;
  contributed_by: string | null;
  /** Array of venue Category objects (when fetched via GET /venues/:id) */
  categories?: VenueCategory[];
  /** Resolved by backend from venue_categories.is_primary, only on detail response */
  primary_category_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueCategory {
  id: string;
  key: string;
  display_name: string;
  synonyms: string[];
  description: string | null;
  display_order: number;
  is_active: boolean;
  /** Only set when returned as part of a venue's categories list */
  is_primary?: boolean;
}

export interface CreateVenueRequest {
  name: string;
  branch_name?: string;
  description?: string;
  address_line: string;
  ward?: string;
  city_id: string;
  district_id: string;
  latitude: number;
  longitude: number;
  total_capacity?: number;
  max_group_size?: number;
  is_group_friendly?: boolean;
  media?: string[];
  menu_image_url?: string;
  opening_hours?: Record<string, { open: string; close: string }>;
  category_ids?: string[];
  primary_category_id?: string;
}

export type UpdateVenueRequest = Partial<CreateVenueRequest>;

export interface VenueSearchParams {
  query?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  min_rating?: number;
  amenities?: string[];
  price_range?: string;
  sort_by?: 'rating' | 'distance' | 'newest';
  page?: number;
  limit?: number;
}

// ── Search result (from search-ai-service) ─────────────────────────

export interface SearchScoreBreakdown {
  semantic: number;
  tag: number;
  name: number;
  category_match: number;
  rating: number;
  location: number;
  strategy: string;
}

export interface SearchResult {
  id: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  /** Pre-composed "<address_line>, <ward>, <district>, <city>" for display */
  address: string;
  address_line: string | null;
  ward: string | null;
  city_id: string | null;
  city: string | null;
  district_id: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  media: string[];
  max_group_size: number;
  is_group_friendly: boolean;
  current_crowd_level: CrowdLevel;
  rating_avg: number;
  review_count: number;
  opening_hours: Record<string, { open: string; close: string }> | null;
  relevance_score: number;
  vector_distance: number | null;
  name_score: number;
  /** Metres from query coordinates (only set when lat/lng provided) */
  distance_m: number | null;
  matched_tags: string[];
  matched_categories: string[];
  score_breakdown?: SearchScoreBreakdown;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  debug?: boolean;
  /** User latitude for distance ranking */
  lat?: number;
  /** User longitude for distance ranking */
  lng?: number;
  /** Restrict to venues within this many metres of (lat, lng) */
  max_distance_m?: number;
}

export interface MenuCategory {
  id: string;
  venue_id: string;
  name: string;
  display_order: number;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  venue_id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
}
