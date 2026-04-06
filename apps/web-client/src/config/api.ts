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
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    UPDATE_PROFILE: '/auth/profile',
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
    LIST: (venueId: string) => `/reviews/venue/${venueId}`,
    CREATE: '/reviews',
  },

  // Favorites
  FAVORITES: {
    LIST: '/favorites',
    TOGGLE: (venueId: string) => `/favorites/${venueId}`,
  },

  // Owner
  OWNER: {
    MY_VENUES: '/venues/owner/my-venues',
    BOOKINGS: '/owner/bookings',
    CROWD: '/owner/crowd-level',
  },

  // Menu (per venue)
  MENU: {
    CATEGORIES: (venueId: string) => `/venues/${venueId}/menu/categories`,
    CATEGORY: (venueId: string, catId: string) => `/venues/${venueId}/menu/categories/${catId}`,
    ITEMS: (venueId: string) => `/venues/${venueId}/menu/items`,
    ITEM: (venueId: string, itemId: string) => `/venues/${venueId}/menu/items/${itemId}`,
  },

  // Admin
  ADMIN: {
    USERS: '/admin/users',
    VENUES: '/admin/venues',
    REPORTS: '/admin/reports',
    STATS: '/admin/stats',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },

  // Search
  SEARCH: {
    SEMANTIC: '/search',
    SUGGESTIONS: '/search/suggestions',
  },

  // Upload
  UPLOAD: '/upload',
} as const;
