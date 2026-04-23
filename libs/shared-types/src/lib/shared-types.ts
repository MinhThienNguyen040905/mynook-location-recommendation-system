// ---- Enums ----

export enum AccountType {
  CUSTOMER = 'customer',
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
  ownerId: string;
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

// ---- RabbitMQ Queues ----
// Mỗi consumer service có queue riêng, bind vào exchange bằng routing keys.

export const RMQ_QUEUES = {
  INTERACTION: 'interaction_queue',
  SEARCH_AI: 'search_ai_queue',
} as const;

// ---- RabbitMQ Routing Keys (Topic Exchange) ----
//
//  Pattern syntax:
//    'user.registered'  → exact match
//    'user.*'           → mọi event bắt đầu bằng 'user.'
//    'venue.#'          → mọi event bắt đầu bằng 'venue.' (multi-level)
//    '#'                → nhận tất cả
//
//  Ví dụ: interaction-service subscribe ['user.*', 'venue.reviewed']
//         search-ai-service subscribe ['user.registered', 'venue.*']

export const RMQ_EVENTS = {
  // User domain
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',

  // Venue domain
  VENUE_CREATED: 'venue.created',
  VENUE_UPDATED: 'venue.updated',

  // Interaction domain
  VENUE_REVIEWED: 'venue.reviewed',
} as const;

// ---- RabbitMQ Event Payloads ----

export interface UserRegisteredEvent {
  accountId: string;
  email: string;
  fullName: string | null;
  type: AccountType;
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
