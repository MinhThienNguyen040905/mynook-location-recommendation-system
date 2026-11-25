import { request, type FullConfig } from '@playwright/test';
import { deleteTestData } from './db';
import { API_URL, WEB_URL } from './env';
import { deleteEmailsTo, mailpitAvailable } from './mailpit';

/** Dọn dữ liệu test còn sót + làm nóng các trang Next.js (lần đầu biên dịch rất chậm ở chế độ dev). */
export default async function globalSetup(_config: FullConfig) {
  if (!(await mailpitAvailable())) {
    throw new Error('[e2e] Mailpit chưa chạy (http://localhost:8026) — chạy `npm run infra:up` trước');
  }
  await deleteEmailsTo();

  const removed = await deleteTestData();
  if (removed > 0) console.log(`[e2e] Đã dọn ${removed} tài khoản test còn sót từ lần chạy trước`);

  const ctx = await request.newContext();
  const health = await ctx.get(`${API_URL.replace(/\/api$/, '')}/docs`).catch(() => null);
  if (!health || !health.ok()) {
    console.warn('[e2e] Cảnh báo: API gateway chưa phản hồi /docs');
  }
  for (const path of ['/login', '/register', '/forgot-password', '/profile', '/']) {
    await ctx.get(`${WEB_URL}${path}`, { timeout: 180_000 }).catch(() => undefined);
  }
  await ctx.dispose();
}
