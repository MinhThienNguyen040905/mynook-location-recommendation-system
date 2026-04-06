export interface Review {
  id: string;
  account_id: string;
  venue_id: string;
  rating: number;
  content: string | null;
  media: string[];
  is_verified_visit: boolean;
  created_at: string;
}

export interface CreateReviewRequest {
  venue_id: string;
  rating: number;
  content?: string;
  media?: string[];
}
