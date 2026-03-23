/**
 * Route constants for the application.
 * Use these instead of hardcoding paths throughout the app.
 */
export const ROUTES = {
  // Public
  HOME: '/',
  SEARCH: '/search',
  VENUE_DETAIL: (id: string) => `/venues/${id}`,

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // User
  PROFILE: '/profile',
  BOOKINGS: '/bookings',
  BOOKING_DETAIL: (id: string) => `/bookings/${id}`,
  FAVORITES: '/favorites',

  // Owner
  DASHBOARD: '/dashboard',
  DASHBOARD_VENUE: '/dashboard/venue',
  DASHBOARD_MENU: '/dashboard/menu',
  DASHBOARD_BOOKINGS: '/dashboard/bookings',
  DASHBOARD_REVIEWS: '/dashboard/reviews',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_VENUES: '/admin/venues',
  ADMIN_REPORTS: '/admin/reports',
} as const;

/** Routes accessible without authentication */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.SEARCH,
  '/venues',
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
] as const;

/** Routes that require authentication */
export const AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD] as const;

/** Route prefix for owner dashboard */
export const OWNER_PREFIX = '/dashboard';

/** Route prefix for admin panel */
export const ADMIN_PREFIX = '/admin';
