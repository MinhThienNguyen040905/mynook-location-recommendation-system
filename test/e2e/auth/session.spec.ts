import { test, expect } from '@playwright/test';
import { ACCESS_COOKIE, REFRESH_COOKIE, createUser, getCookie, loginViaUi } from '../../support/auth';
import { API_URL, WEB_URL } from '../../support/env';

/** Spec 001 — US-2: giữ phiên (làm mới mã truy cập trong suốt) */
test.describe('US-2 Giữ phiên', () => {
  test('AC-2.4: mã truy cập hỏng nhưng mã làm mới còn hạn → tự làm mới, vẫn dùng được', async ({ page, request }) => {
    const user = await createUser(request);
    await loginViaUi(page, user.email, user.password);

    await page.context().addCookies([
      { name: ACCESS_COOKIE, value: 'hong.hong.hong', url: WEB_URL },
    ]);

    const refreshed = page.waitForResponse((r) => r.url().endsWith('/auth/refresh'));
    const profile = page.waitForResponse(
      (r) => r.url().endsWith('/auth/profile') && r.request().method() === 'GET' && r.status() === 200,
    );
    await page.goto('/profile');
    expect((await refreshed).status()).toBe(201);
    await profile;                                     // request gốc được gửi lại và thành công

    const newToken = await getCookie(page, ACCESS_COOKIE);
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe('hong.hong.hong');
    await expect(page).toHaveURL(/\/profile/);
  });

  test('AC-2.5: cả hai mã đều hỏng → đăng xuất và chuyển tới /login', async ({ page, request }) => {
    const user = await createUser(request);
    await loginViaUi(page, user.email, user.password);

    await page.context().addCookies([
      { name: ACCESS_COOKIE, value: 'hong.hong.hong', url: WEB_URL },
      { name: REFRESH_COOKIE, value: 'hong.hong.hong', url: WEB_URL },
    ]);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
    expect(await getCookie(page, ACCESS_COOKIE)).toBeFalsy();
  });

  test('FR-3: mã làm mới không dùng được như mã truy cập (hai khoá ký khác nhau)', async ({ request }) => {
    const user = await createUser(request);
    const res = await request.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${user.refreshToken}` },
    });
    expect(res.status()).toBe(401);
  });

  test('FR-4: thông tin tài khoản trả về không chứa mật khẩu hay mã đặt lại', async ({ request }) => {
    const user = await createUser(request);
    const res = await request.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(user.email);
    expect(body.trust_score).toBe(100);                 // FR-2
    for (const key of ['password_hash', 'password_reset_token', 'password_reset_expires']) {
      expect(body).not.toHaveProperty(key);
    }
  });
});
