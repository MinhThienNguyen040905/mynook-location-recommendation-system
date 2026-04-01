/**
 * API configuration for the web client.
 * All requests go through the API Gateway.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },

  // Venues
  VENUES: {
    LIST: '/venues',
    DETAIL: (id: string) => `/venues/${id}`,
    SEARCH: '/venues/search',
    NEARBY: '/venues/nearby',
    TRENDING: '/venues/trending',
  },

  // Bookings
  BOOKINGS: {
    LIST: '/bookings',
    CREATE: '/bookings',
    DETAIL: (id: string) => `/bookings/${id}`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
  },

  // Reviews
  REVIEWS: {
    LIST: (venueId: string) => `/venues/${venueId}/reviews`,
    CREATE: (venueId: string) => `/venues/${venueId}/reviews`,
    REPLY: (reviewId: string) => `/reviews/${reviewId}/reply`,
  },

  // Favorites
  FAVORITES: {
    LIST: '/favorites',
    TOGGLE: (venueId: string) => `/favorites/${venueId}`,
  },

  // Owner
  OWNER: {
    VENUE: '/owner/venue',
    MENU: '/owner/menu',
    BOOKINGS: '/owner/bookings',
    CROWD: '/owner/crowd-level',
  },

  // Admin
  ADMIN: {
    USERS: '/admin/users',
    VENUES: '/admin/venues',
    REPORTS: '/admin/reports',
    STATS: '/admin/stats',
  },

  // Search
  SEARCH: {
    SEMANTIC: '/search',
    SUGGESTIONS: '/search/suggestions',
  },

  // Upload
  UPLOAD: '/upload',
} as const;
