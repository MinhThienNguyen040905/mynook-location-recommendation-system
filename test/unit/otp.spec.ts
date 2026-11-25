import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OTP_MAX_ATTEMPTS, generateOtp, hashOtp, otpMatches } from '../../apps/auth-service/src/app/modules/auth/otp';

/** Spec 001 GAP 5, GAP 6 (LOG-004) — OTP sinh an toàn, so khớp an toàn. */
test.describe('OTP', () => {
  test('luôn là đúng 6 chữ số, trong khoảng 100000–999999', () => {
    for (let i = 0; i < 2000; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^[1-9]\d{5}$/);
    }
  });

  test('phân bố đủ ngẫu nhiên (2000 mã → gần như không trùng)', () => {
    const set = new Set(Array.from({ length: 2000 }, generateOtp));
    expect(set.size).toBeGreaterThan(1990);
  });

  test('sinh bằng bộ sinh an toàn mật mã, không dùng Math.random', () => {
    const src = readFileSync(resolve(__dirname, '../../apps/auth-service/src/app/modules/auth/otp.ts'), 'utf8');
    expect(src).toContain('randomInt');
    expect(src).not.toMatch(/Math\.random/);
    const svc = readFileSync(resolve(__dirname, '../../apps/auth-service/src/app/modules/auth/auth.service.ts'), 'utf8');
    expect(svc, 'auth.service không được tự sinh OTP bằng Math.random').not.toMatch(/Math\.random/);
  });

  test('otpMatches: đúng mã → true, sai mã / sai độ dài → false', () => {
    const otp = generateOtp();
    const stored = hashOtp(otp);
    expect(otpMatches(otp, stored)).toBe(true);
    expect(otpMatches(otp === '123456' ? '654321' : '123456', stored)).toBe(false);
    expect(otpMatches('', stored)).toBe(false);
    expect(otpMatches(otp, 'abc')).toBe(false);
  });

  test('giới hạn nhập sai là 5 lần', () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });
});
