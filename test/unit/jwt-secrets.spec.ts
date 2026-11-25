import { test, expect } from '@playwright/test';
import { getJwtSecrets } from '../../libs/shared-types/src/lib/jwt-secrets';

/** Spec 001 GAP 3 (LOG-004) — khoá ký JWT bắt buộc ở production. */
test.describe('getJwtSecrets', () => {
  test('production thiếu JWT_SECRET → lỗi khi khởi động', () => {
    expect(() => getJwtSecrets({ NODE_ENV: 'production', JWT_REFRESH_SECRET: 'r' })).toThrow(/JWT_SECRET/);
  });

  test('production thiếu JWT_REFRESH_SECRET → lỗi', () => {
    expect(() => getJwtSecrets({ NODE_ENV: 'production', JWT_SECRET: 'a' })).toThrow(/JWT_REFRESH_SECRET/);
  });

  test('production: chuỗi rỗng / khoảng trắng coi như thiếu', () => {
    expect(() => getJwtSecrets({ NODE_ENV: 'production', JWT_SECRET: '  ', JWT_REFRESH_SECRET: 'r' })).toThrow();
  });

  test('production: hai khoá trùng nhau → lỗi (FR-3: hai khoá khác nhau)', () => {
    expect(() => getJwtSecrets({ NODE_ENV: 'production', JWT_SECRET: 'same', JWT_REFRESH_SECRET: 'same' })).toThrow(/khác nhau/);
  });

  test('production đủ khoá → dùng đúng khoá đã cấu hình', () => {
    const s = getJwtSecrets({
      NODE_ENV: 'production', JWT_SECRET: 'acc', JWT_REFRESH_SECRET: 'ref',
      JWT_ACCESS_EXPIRES_IN: '10m', JWT_REFRESH_EXPIRES_IN: '30d',
    });
    expect(s).toEqual({ accessSecret: 'acc', refreshSecret: 'ref', accessExpiresIn: '10m', refreshExpiresIn: '30d' });
  });

  test('dev thiếu khoá → dùng khoá mặc định (khác nhau), thời hạn mặc định 15m / 7d', () => {
    const s = getJwtSecrets({ NODE_ENV: 'development' });
    expect(s.accessSecret).toBeTruthy();
    expect(s.refreshSecret).toBeTruthy();
    expect(s.accessSecret).not.toBe(s.refreshSecret);
    expect(s.accessExpiresIn).toBe('15m');
    expect(s.refreshExpiresIn).toBe('7d');
  });

  test('thời hạn rỗng trong .env → dùng mặc định (trước đây truyền chuỗi rỗng)', () => {
    const s = getJwtSecrets({ NODE_ENV: 'development', JWT_ACCESS_EXPIRES_IN: '', JWT_REFRESH_EXPIRES_IN: '' });
    expect(s.accessExpiresIn).toBe('15m');
    expect(s.refreshExpiresIn).toBe('7d');
  });
});
