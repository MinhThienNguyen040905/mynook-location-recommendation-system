/**
 * Cấu hình ký JWT dùng chung cho auth-service (ký) và api-gateway (xác thực) — spec 001 GAP 3, LOG-004.
 *
 * - Production (`NODE_ENV=production`): BẮT BUỘC có `JWT_SECRET` và `JWT_REFRESH_SECRET`, và hai khoá
 *   phải KHÁC nhau (FR-3) — thiếu / trùng → ném lỗi ngay khi khởi động (fail fast).
 * - Ngoài production: thiếu thì dùng khoá mặc định cho dev và cảnh báo một lần.
 *
 * Gọi hàm này thay vì đọc `process.env.JWT_*` trực tiếp để gateway và auth-service không bao giờ lệch khoá.
 */
export interface JwtSecrets {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

const DEV_ACCESS_SECRET = 'mynook-dev-secret';
const DEV_REFRESH_SECRET = 'mynook-refresh-dev-secret';

let warned = false;

export function getJwtSecrets(env: Record<string, string | undefined> = process.env): JwtSecrets {
  const isProduction = env['NODE_ENV'] === 'production';
  const access = env['JWT_SECRET']?.trim() || '';
  const refresh = env['JWT_REFRESH_SECRET']?.trim() || '';

  if (isProduction) {
    const missing = [!access && 'JWT_SECRET', !refresh && 'JWT_REFRESH_SECRET'].filter(Boolean);
    if (missing.length) {
      throw new Error(`[jwt] Thiếu ${missing.join(', ')} — bắt buộc khi NODE_ENV=production`);
    }
    if (access === refresh) {
      throw new Error('[jwt] JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau khi NODE_ENV=production');
    }
  } else if ((!access || !refresh) && !warned) {
    warned = true;
    console.warn('[jwt] JWT_SECRET / JWT_REFRESH_SECRET chưa cấu hình — dùng khoá mặc định cho dev (KHÔNG dùng ở production)');
  }

  return {
    accessSecret: access || DEV_ACCESS_SECRET,
    refreshSecret: refresh || DEV_REFRESH_SECRET,
    accessExpiresIn: env['JWT_ACCESS_EXPIRES_IN']?.trim() || '15m',
    refreshExpiresIn: env['JWT_REFRESH_EXPIRES_IN']?.trim() || '7d',
  };
}
