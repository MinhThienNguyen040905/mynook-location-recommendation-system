/** Token storage key */
export const ACCESS_TOKEN_KEY = 'mynook_access_token';
export const REFRESH_TOKEN_KEY = 'mynook_refresh_token';
/** Cookie lưu vai trò (customer | owner | admin) — proxy.ts đọc để phân quyền trang */
export const USER_TYPE_KEY = 'user_type';

/**
 * Mã lỗi máy đọc được trong thân lỗi API ({ message, error_code }).
 * Bản sao của AUTH_ERROR_CODES trong libs/shared-types — không import lib đó vào Next.js
 * vì nó kéo theo @nestjs/common. Sửa bên nào thì sửa cả bên kia.
 */
export const AUTH_ERROR_CODES = {
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
} as const;

/** Thông báo venue-service trả khi ảnh menu quá dài cho model đọc ảnh (spec 018 AC-4.3) */
export const MENU_TOO_LONG_MESSAGE = 'Menu quá dài — hãy chụp từng phần';

/** Thông báo lỗi khi phân tích ảnh menu: giữ câu "menu quá dài" từ backend, còn lại dùng câu chung */
export function menuAnalyzeErrorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return message === MENU_TOO_LONG_MESSAGE
    ? MENU_TOO_LONG_MESSAGE
    : 'Phân tích ảnh thất bại. Vui lòng thử với ảnh rõ hơn.';
}

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
