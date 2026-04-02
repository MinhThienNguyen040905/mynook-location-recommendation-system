// ---- Enums ----

export enum AccountType {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
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

export interface IAccount {
  id: string;
  email: string;
  full_name: string | null;
  type: AccountType;
}

export interface IVenue {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  latitude: number;
  longitude: number;
  businessId: string;
  branchName?: string | null;
}

export interface IReview {
  id: string;
  venueId: string;
  accountId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// ---- Service URLs (HTTP) ----

export const AUTH_SERVICE_URL =
  process.env['AUTH_SERVICE_URL'] || 'http://localhost:3002';
export const VENUE_SERVICE_URL =
  process.env['VENUE_SERVICE_URL'] || 'http://localhost:3003';
export const INTERACTION_SERVICE_URL =
  process.env['INTERACTION_SERVICE_URL'] || 'http://localhost:3004';
export const SEARCH_AI_SERVICE_URL =
  process.env['SEARCH_AI_SERVICE_URL'] || 'http://localhost:3005';
