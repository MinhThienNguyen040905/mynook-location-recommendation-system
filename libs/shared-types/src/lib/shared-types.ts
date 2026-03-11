// ---- Enums ----

export enum UserRole {
  USER = 'user',
  OWNER = 'owner',
  ADMIN = 'admin',
}

export enum VenueCategory {
  CAFE = 'cafe',
  RESTAURANT = 'restaurant',
  COWORKING = 'coworking',
  LIBRARY = 'library',
  BAR = 'bar',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// ---- Interfaces ----

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface IVenue {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  latitude: number;
  longitude: number;
  ownerId: string;
}

export interface IReview {
  id: string;
  venueId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// ---- Microservice message patterns ----

export const AUTH_SERVICE = 'AUTH_SERVICE';
export const VENUE_SERVICE = 'VENUE_SERVICE';
export const INTERACTION_SERVICE = 'INTERACTION_SERVICE';
export const SEARCH_AI_SERVICE = 'SEARCH_AI_SERVICE';
