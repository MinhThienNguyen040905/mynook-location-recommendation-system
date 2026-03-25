export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  rating_avg: number;
  review_count: number;
  media: string[];
  opening_hours: Record<string, { open: string; close: string }>;
  amenities: string[];
  current_crowd_level: CrowdLevel;
  is_verified: boolean;
  owner_id: string;
  created_at: string;
}

export type CrowdLevel = 'low' | 'medium' | 'high' | 'full';

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

export interface MenuItem {
  id: string;
  venue_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
}
