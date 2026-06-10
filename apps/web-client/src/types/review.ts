/** AI analysis result attached to a review by search-ai-service */
export interface ReviewAiAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number; // -1.0 to 1.0
  positive_tags: string[];
  negative_tags: string[];
  new_tags: Array<{ key: string; display_name: string; category: string }>;
  time_context: 'morning' | 'afternoon' | 'evening' | 'all_day' | null;
  summary: string;
}

export interface ReviewAuthor {
  id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Review {
  id: string;
  account_id: string;
  venue_id: string;
  rating: number;
  content: string | null;
  media: string[];
  ai_analysis_json: ReviewAiAnalysis | null;
  is_verified_visit: boolean;
  created_at: string;
  author: ReviewAuthor | null;
}

export interface UserReview {
  id: string;
  account_id: string;
  venue_id: string;
  rating: number;
  content: string | null;
  media: string[];
  ai_analysis_json: ReviewAiAnalysis | null;
  is_verified_visit: boolean;
  created_at: string;
  venue: {
    id: string;
    name: string;
    branch_name: string | null;
    address_line: string | null;
    ward: string | null;
    city_name: string | null;
    district_name: string | null;
    media: string[];
    rating_avg: number;
    review_count: number;
  } | null;
}

export interface UserReviewListResponse {
  total: number;
  data: UserReview[];
}

export interface CreateReviewRequest {
  venue_id: string;
  rating: number;
  content?: string;
  media?: string[];
}
