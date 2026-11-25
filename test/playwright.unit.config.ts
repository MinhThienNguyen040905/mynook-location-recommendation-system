import { defineConfig } from '@playwright/test';

/**
 * Test đơn vị (logic thuần, không cần service / trình duyệt) — chạy: `npm run test:unit`.
 * Dùng chung trình chạy Playwright để không thêm thư viện test mới (xem specs/stack.md).
 */
export default defineConfig({
  testDir: './unit',
  outputDir: './.results-unit',
  fullyParallel: true,
  reporter: [['list']],
});
