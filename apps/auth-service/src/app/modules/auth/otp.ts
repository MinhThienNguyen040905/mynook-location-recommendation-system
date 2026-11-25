import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/** Số lần nhập sai OTP tối đa cho một mã — đủ thì mã bị huỷ (spec 001 GAP 6, LOG-004). */
export const OTP_MAX_ATTEMPTS = 5;

/** Thời gian hiệu lực của OTP đăng ký. */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** Mã OTP 6 chữ số từ bộ sinh số ngẫu nhiên an toàn mật mã (spec 001 GAP 5). */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/** So khớp OTP với hash đã lưu, thời gian so sánh không phụ thuộc nội dung (chống dò theo thời gian). */
export function otpMatches(otp: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(otp), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
