export type CrowdLevel = 'empty' | 'moderate' | 'crowded' | 'full';

export interface Venue {
  id: string;
  owner_id: string;
  branch_name: string | null;
  name: string;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface CreateVenueRequest {
  name: string;
  branch_name?: string;
  description?: string;
  address: string;
  city?: string;
  district?: string;
  latitude: number;
  longitude: number;
  total_capacity?: number;
  max_group_size?: number;
  is_group_friendly?: boolean;
  media?: string[];
  opening_hours?: Record<string, { open: string; close: string }>;
}

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

/** Result from hybrid search API (search-ai-service) */
export interface SearchResult {
  id: string;
  name: string;
  branch_name: string | null;
  description: string | null;
  address: string;
  city: string;
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
  matched_tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
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
