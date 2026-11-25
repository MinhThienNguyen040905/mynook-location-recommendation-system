import { test, expect } from '@playwright/test';
import { apiLogin, createUser } from '../../support/auth';
import { API_URL } from '../../support/env';

/** Spec 001 — US-4: Đổi mật khẩu & cập nhật hồ sơ (chưa có giao diện đổi mật khẩu → kiểm qua API) */
test.describe('US-4 Đổi mật khẩu & hồ sơ', () => {
  test('AC-4.1: đúng mật khẩu hiện tại → đổi thành công', async ({ request }) => {
    const user = await createUser(request);
    const res = await request.post(`${API_URL}/auth/change-password`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { old_password: user.password, new_password: 'Doi-Moi-789' },
    });
    expect(res.status()).toBe(201);
    expect((await apiLogin(request, user.email, 'Doi-Moi-789')).status()).toBe(201);
    expect((await apiLogin(request, user.email, user.password)).status()).toBe(401);
  });

  test('AC-4.2: sai mật khẩu hiện tại → "Mật khẩu hiện tại không đúng"', async ({ request }) => {
    const user = await createUser(request);
    const res = await request.post(`${API_URL}/auth/change-password`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { old_password: 'khong-dung', new_password: 'Doi-Moi-789' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe('Mật khẩu hiện tại không đúng');
  });

  test('AC-4.3: cập nhật hồ sơ chỉ đổi trường được gửi; email và vai trò không đổi được', async ({ request }) => {
    const user = await createUser(request);
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const res = await request.patch(`${API_URL}/auth/profile`, {
      headers,
      data: {
        full_name: 'Tên Mới E2E',
        email: 'e2e+chiem-email@mynook.test',
        type: 'admin',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.full_name).toBe('Tên Mới E2E');
    expect(body.email).toBe(user.email);
    expect(body.type).toBe('customer');
    expect(body.phone_number).toBeNull();              // trường không gửi thì giữ nguyên
  });

  test('Giao diện: trang hồ sơ hiển thị tên người dùng sau khi đăng nhập', async ({ page, request }) => {
    const user = await createUser(request);
    await page.goto('/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Đăng nhập thành công!')).toBeVisible();
    await page.goto('/profile');
    await expect(page.getByText(user.fullName).first()).toBeVisible();
  });
});
