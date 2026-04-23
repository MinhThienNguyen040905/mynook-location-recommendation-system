/** Token storage key */
export const ACCESS_TOKEN_KEY = 'mynook_access_token';
export const REFRESH_TOKEN_KEY = 'mynook_refresh_token';

/** Crowd level labels */
export const CROWD_LEVEL_LABELS: Record<string, string> = {
  low: 'Vắng',
  medium: 'Bình thường',
  high: 'Đông',
  full: 'Hết chỗ',
};

/** Crowd level colors (Tailwind classes) */
export const CROWD_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  full: 'bg-red-500',
};

/** Breakpoints matching Tailwind defaults */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 12;

/** Upload limits */
export const MAX_UPLOAD_SIZE_MB = 5;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
