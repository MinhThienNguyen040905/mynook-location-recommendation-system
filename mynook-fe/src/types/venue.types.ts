// types/venue.types.ts
export type CrowdLevel = "empty" | "moderate" | "crowded" | "full";

export interface MediaItem {
  url: string;
  type: "image" | "video";
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  category: "cafe" | "restaurant" | "study_space" | "other";
  address: string;
  lat: number;
  lng: number;
  rating: number; // Tương ứng rating_avg
  reviewCount: number;

  // Các field quan trọng bổ sung từ spec
  media: MediaItem[];
  current_crowd_level: CrowdLevel;
  total_capacity?: number;
  opening_hours?: any; // Có thể định nghĩa type chi tiết sau

  tags: string[];
  createdAt: string;
  updatedAt: string;
}
