import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { WEB_URL } from './support/env';

/** webServer mặc định chạy trong thư mục chứa config (test/) — phải chạy ở root repo. */
const ROOT = resolve(__dirname, '..');

/**
 * E2E MyNook — chạy từ root repo:  npm run e2e
 *
 * Playwright tự khởi động auth-service, api-gateway, web-client (dùng lại nếu đang chạy sẵn).
 * Redis tắt khi test để rate limit (10 lần / 5 phút) không chặn test; nhóm @redis chạy riêng.
 */
const isWin = process.platform === 'win32';
const nx = isWin ? 'npx.cmd nx' : 'npx nx';

// process.env đã chứa .env (nạp trong support/env.ts) → service dùng cùng JWT secret, DATABASE_URL.
const serviceEnv = {
  ...process.env,
  REDIS_ENABLED: process.env['E2E_REDIS'] === '1' ? 'true' : 'false',
  NODE_ENV: 'development',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
} as Record<string, string>;

/** Build backend rồi chạy thẳng dist — tránh nhiều `nx serve` song song tranh chấp nhau. */
const backend = (app: string) =>
  `${nx} build ${app} --configuration=development && node apps/${app}/dist/main.js`;

/** auth-service gửi email vào Mailpit (docker: SMTP :1026, API :8026) — không gửi email thật khi test */
const mailpitSmtp = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1026',
  SMTP_USER: '',
  SMTP_PASS: '',
  APP_URL: WEB_URL,
};

const server = (command: string, url: string, extraEnv: Record<string, string> = {}) => ({
  command,
  url,
  cwd: ROOT,
  env: { ...serviceEnv, ...extraEnv },
  reuseExistingServer: true,
  timeout: 300_000,
  stdout: 'ignore' as const,
  stderr: 'pipe' as const,
});

export default defineConfig({
  testDir: './e2e',
  outputDir: './.results',
  globalSetup: './support/global-setup.ts', // kiểm tra Mailpit, dọn dữ liệu cũ, làm nóng trang
  globalTeardown: './support/global-teardown.ts',
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  grepInvert: process.env['E2E_REDIS'] === '1' ? undefined : /@redis/,
  reporter: [
    ['list'],
    ['html', { outputFolder: './.report', open: 'never' }],
  ],
  use: {
    baseURL: WEB_URL,
    locale: 'vi-VN',
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    server(backend('auth-service'), 'http://localhost:3002/docs', mailpitSmtp),
    server(backend('api-gateway'), 'http://localhost:3001/docs'),
    server(`${nx} serve web-client`, `${WEB_URL}/login`),
  ],
});
