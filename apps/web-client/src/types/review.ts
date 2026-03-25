export interface Review {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
  content: string;
  media: string[];
  is_verified_visit: boolean;
  helpful_count: number;
  reply?: ReviewReply;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
    trust_score: number;
  };
  created_at: string;
}

export interface ReviewReply {
  id: string;
  content: string;
  created_at: string;
}

export interface CreateReviewRequest {
  venue_id: string;
  rating: number;
  content: string;
  media?: File[];
  is_verified_visit?: boolean;
}
