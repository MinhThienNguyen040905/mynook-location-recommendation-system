export interface Venue {
  id: string;
  name: string;
  description: string;
  category: 'cafe' | 'restaurant' | 'study_space' | 'other';
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
