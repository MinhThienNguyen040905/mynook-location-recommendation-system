import { test, expect } from '@playwright/test';
import { apiLogin, createUser, loginViaUi } from '../../support/auth';
import { API_URL } from '../../support/env';

/** Spec 001 — US-5: Phân quyền theo vai trò */
test.describe('US-5 Phân quyền', () => {
  test('AC-5.2: khách hàng gọi API quản trị → 403; không có phiên → 401', async ({ request }) => {
    const user = await createUser(request);
    const asCustomer = await request.get(`${API_URL}/admin/accounts`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(asCustomer.status()).toBe(403);

    const anonymous = await request.get(`${API_URL}/admin/accounts`);
    expect(anonymous.status()).toBe(401);
  });

  test('AC-5.2: chủ quán gọi API quản trị → 403', async ({ request }) => {
    const owner = await createUser(request, 'owner');
    const res = await request.get(`${API_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${owner.accessToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('AC-5.2: mã truy cập giả mạo / hỏng → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sai-chu-ky' },
    });
    expect(res.status()).toBe(401);
  });

  test('AC-5.1: chưa đăng nhập vào /favorites → chuyển tới /login kèm callbackUrl', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Ffavorites/, { timeout: 8_000 });
  });

  test('AC-5.1: khách hàng vào /admin và /dashboard → bị chuyển về trang chủ', async ({ page, request }) => {
    const user = await createUser(request);
    await loginViaUi(page, user.email, user.password);
    await page.goto('/admin');
    await expect(page).toHaveURL(/localhost:3000\/$/, { timeout: 8_000 });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/localhost:3000\/$/, { timeout: 8_000 });
  });
});

/** NFR-2 — chỉ chạy khi bật Redis: E2E_REDIS=1 npm run e2e -- --grep @redis */
test.describe('NFR-2 Giới hạn tần suất @redis', () => {
  test('quá 10 lần đăng nhập / 5 phút → 429 kèm Retry-After', async ({ request }) => {
    const email = `e2e+rate-${Date.now()}@mynook.test`;
    let last;
    for (let i = 0; i < 11; i++) last = await apiLogin(request, email, 'sai');
    expect(last!.status()).toBe(429);
    expect(Number(last!.headers()['retry-after'])).toBeGreaterThan(0);
  });
});
