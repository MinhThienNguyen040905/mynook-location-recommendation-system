import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import './support/env';

/**
 * Bộ test AI — spec 018. Chạy từ root repo: `npm run test:ai` (gọi test/ai/run.mjs).
 *
 * Hai lượt:
 *  - Bình thường: model thật (gpt-oss-20b / gpt-oss-120b / qwen3.8-27b, embedding cục bộ).
 *  - E2E_AI_FAILURE=1: search-ai-service khởi động với GROQ_REVIEW_MODEL không tồn tại
 *    → kiểm tra AC-3.3 (AI lỗi không gây vòng lặp hàng đợi). Chỉ chạy test gắn @failure.
 *
 * Test gắn @groq tốn hạn mức Groq miễn phí (~40–60 nghìn token / lượt).
 */
const ROOT = resolve(__dirname, '..');
const FAILURE_MODE = process.env['E2E_AI_FAILURE'] === '1';

const isWin = process.platform === 'win32';
const nx = isWin ? 'npx.cmd nx' : 'npx nx';

const serviceEnv = {
  ...process.env,
  REDIS_ENABLED: 'false',
  NODE_ENV: 'development',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
} as Record<string, string>;

const backend = (app: string) =>
  `${nx} build ${app} --configuration=development && node apps/${app}/dist/main.js`;

const server = (app: string, port: number, env: Record<string, string> = serviceEnv) => ({
  command: backend(app),
  url: `http://localhost:${port}/docs`,
  cwd: ROOT,
  env,
  // Lượt lỗi phải tự khởi động search-ai với model sai — không được dùng lại tiến trình đang chạy
  reuseExistingServer: !FAILURE_MODE,
  timeout: 300_000,
  stdout: 'ignore' as const,
  stderr: 'pipe' as const,
});

export default defineConfig({
  testDir: './ai',
  outputDir: './.results-ai',
  globalTeardown: './support/ai-teardown.ts',
  fullyParallel: false,
  workers: 1, // tuần tự: tránh vượt hạn mức token / phút của Groq
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  grep: FAILURE_MODE ? /@failure/ : undefined,
  grepInvert: FAILURE_MODE ? undefined : /@failure/,
  reporter: [
    ['list'],
    ['html', { outputFolder: './.report-ai', open: 'never' }],
  ],
  use: { trace: 'retain-on-failure' },
  webServer: [
    server('auth-service', 3002),
    server('api-gateway', 3001),
    server('venue-service', 3003),
    server('interaction-service', 3004),
    server(
      'search-ai-service',
      3005,
      FAILURE_MODE ? { ...serviceEnv, GROQ_REVIEW_MODEL: 'e2e/model-khong-ton-tai' } : serviceEnv,
    ),
  ],
});
