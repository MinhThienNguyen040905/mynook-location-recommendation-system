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
    MY_CONTRIBUTIONS: '/venues/my-contributions',
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
    ANALYZE_IMAGE: (venueId: string) => `/venues/${venueId}/menu/analyze-image`,
    BULK_SAVE: (venueId: string) => `/venues/${venueId}/menu/bulk-save`,
  },

  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    // Accounts
    ACCOUNTS: '/admin/accounts',
    ACCOUNTS_STATS: '/admin/accounts/stats',
    ACCOUNT_DETAIL: (id: string) => `/admin/accounts/${id}`,
    ACCOUNT_STATUS: (id: string) => `/admin/accounts/${id}/status`,
    // Venues
    VENUES: '/admin/venues',
    VENUES_STATS: '/admin/venues/stats',
    VENUES_CITIES: '/admin/venues/cities',
    VENUE_DETAIL: (id: string) => `/admin/venues/${id}`,
    VENUE_RESTORE: (id: string) => `/admin/venues/${id}/restore`,
    VENUE_HARD_DELETE: (id: string) => `/admin/venues/${id}/hard`,
    // Reviews
    REVIEWS: '/admin/reviews',
    REVIEW_DETAIL: (id: string) => `/admin/reviews/${id}`,
    // Review reports
    REPORTS: '/admin/reports',
    REPORTS_STATS: '/admin/reports/stats',
    REPORT_DETAIL: (id: string) => `/admin/reports/${id}`,
    REPORT_RESOLVE: (id: string) => `/admin/reports/${id}/resolve`,
    // Venue reports
    VENUE_REPORTS: '/admin/venue-reports',
    VENUE_REPORTS_STATS: '/admin/venue-reports/stats',
    VENUE_REPORT_DETAIL: (id: string) => `/admin/venue-reports/${id}`,
    VENUE_REPORT_RESOLVE: (id: string) => `/admin/venue-reports/${id}/resolve`,
    // Broadcast
    NOTIFICATIONS_BROADCAST: '/admin/notifications/broadcast',
    // Categories
    CATEGORIES: '/admin/categories',
    CATEGORY_DETAIL: (id: string) => `/admin/categories/${id}`,
    // Locations
    CITIES: '/admin/cities',
    CITY_DETAIL: (id: string) => `/admin/cities/${id}`,
    DISTRICTS: '/admin/districts',
    DISTRICT_DETAIL: (id: string) => `/admin/districts/${id}`,
    // Reindex
    VENUES_REINDEX: '/admin/venues/reindex-embeddings',
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

  // Tags
  TAGS: {
    LIST: '/tags',
  },

  // Locations (cities / districts — public read, admin CRUD)
  LOCATIONS: {
    CITIES: '/cities',
    CITY_DETAIL: (id: string) => `/cities/${id}`,
    DISTRICTS: '/districts',
    DISTRICT_DETAIL: (id: string) => `/districts/${id}`,
  },

  // Categories (venue types — public read)
  CATEGORIES: {
    LIST: '/categories',
    DETAIL: (id: string) => `/categories/${id}`,
  },

  // Upload
  UPLOAD: '/upload',
} as const;
