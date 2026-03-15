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

// ---- Service URLs (HTTP) ----

export const AUTH_SERVICE_URL =
  process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001';
export const VENUE_SERVICE_URL =
  process.env['VENUE_SERVICE_URL'] || 'http://localhost:3002';
export const INTERACTION_SERVICE_URL =
  process.env['INTERACTION_SERVICE_URL'] || 'http://localhost:3003';
export const SEARCH_AI_SERVICE_URL =
  process.env['SEARCH_AI_SERVICE_URL'] || 'http://localhost:3004';
