import { test, expect } from '@playwright/test';
import { apiLogin, createUser } from '../../support/auth';
import { API_URL } from '../../support/env';
import { waitForEmail } from '../../support/mailpit';

/** Spec 001 — US-3: Quên & đặt lại mật khẩu */
test.describe('US-3 Quên mật khẩu', () => {
  test('AC-3.1: email tồn tại và không tồn tại → cùng một thông báo trung tính', async ({ request }) => {
    const user = await createUser(request);
    const known = await request.post(`${API_URL}/auth/forgot-password`, { data: { email: user.email } });
    const unknown = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: `e2e+khong-co-${Date.now()}@mynook.test` },
    });
    expect(known.status()).toBe(201);
    expect(unknown.status()).toBe(201);
    const k = await known.json();
    const u = await unknown.json();
    expect(u.message).toBe(k.message);
    expect(u).not.toHaveProperty('dev_reset_token');   // không lộ email lạ
    expect(k.dev_reset_token).toMatch(/^[0-9a-f]{64}$/); // AC-3.2: email thật thì có mã (dev)
  });

  test('AC-3.2 + AC-3.3 (UI): đặt lại mật khẩu → đăng nhập được bằng mật khẩu mới, mật khẩu cũ hết hiệu lực', async ({ page, request }) => {
    const user = await createUser(request);
    const newPassword = 'Mat-Khau-Moi-456';

    await page.goto('/forgot-password');
    await page.getByPlaceholder('Email của bạn').fill(user.email);
    await page.getByRole('button', { name: /Gửi yêu cầu/ }).click();

    await expect(page.getByRole('heading', { name: 'Mật khẩu mới' })).toBeVisible();
    await page.getByPlaceholder('Mật khẩu mới').fill(newPassword);
    await page.getByPlaceholder('Xác nhận mật khẩu').fill(newPassword);
    await page.getByRole('button', { name: /Xác nhận đổi mật khẩu/ }).click();

    await expect(page.getByText('Đặt lại mật khẩu thành công!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hoàn tất!' })).toBeVisible();

    expect((await apiLogin(request, user.email, newPassword)).status()).toBe(201);
    expect((await apiLogin(request, user.email, user.password)).status()).toBe(401);
  });

  test('GAP-1: email đặt lại mật khẩu chứa liên kết; mở liên kết → đặt mật khẩu mới → đăng nhập được', async ({ page, request }) => {
    const user = await createUser(request);
    const newPassword = 'Tu-Email-789';

    const res = await request.post(`${API_URL}/auth/forgot-password`, { data: { email: user.email } });
    expect(res.status()).toBe(201);

    const mail = await waitForEmail(user.email, 'Đặt lại mật khẩu');
    const link = mail.Text.match(/https?:\/\/\S+\/forgot-password\?token=[0-9a-f]{64}/)?.[0];
    expect(link, 'email phải chứa liên kết đặt lại mật khẩu').toBeTruthy();
    expect(mail.HTML).toContain(link!);

    // Mở liên kết như người dùng bấm trong email → vào thẳng bước "Mật khẩu mới" (AC-3.3)
    await page.goto(new URL(link!).pathname + new URL(link!).search);
    await expect(page.getByRole('heading', { name: 'Mật khẩu mới' })).toBeVisible();
    await page.getByLabel('Mật khẩu mới').fill(newPassword);
    await page.getByLabel('Xác nhận mật khẩu').fill(newPassword);
    await page.getByRole('button', { name: /Xác nhận đổi mật khẩu/ }).click();
    await expect(page.getByRole('heading', { name: 'Hoàn tất!' })).toBeVisible();

    expect((await apiLogin(request, user.email, newPassword)).status()).toBe(201);
  });

  test('GAP-1: email không tồn tại → không có email nào được gửi', async ({ request }) => {
    const ghost = `e2e+ghost-${Date.now()}@mynook.test`;
    await request.post(`${API_URL}/auth/forgot-password`, { data: { email: ghost } });
    await expect(waitForEmail(ghost, 'Đặt lại mật khẩu', 3_000)).rejects.toThrow(/Không nhận được email/);
  });

  test('AC-3.3: mã đặt lại chỉ dùng được một lần', async ({ request }) => {
    const user = await createUser(request);
    const { dev_reset_token } = await (
      await request.post(`${API_URL}/auth/forgot-password`, { data: { email: user.email } })
    ).json();
    const first = await request.post(`${API_URL}/auth/reset-password`, {
      data: { token: dev_reset_token, new_password: 'Lan-Mot-111' },
    });
    expect(first.status()).toBe(201);
    const again = await request.post(`${API_URL}/auth/reset-password`, {
      data: { token: dev_reset_token, new_password: 'Lan-Hai-222' },
    });
    expect(again.status()).toBe(400);
  });

  test('AC-3.4: mã sai → "Token không hợp lệ hoặc đã hết hạn"', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/reset-password`, {
      data: { token: 'a'.repeat(64), new_password: 'Bat-Ky-123' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Token không hợp lệ hoặc đã hết hạn');
  });

  test('Giao diện: mật khẩu xác nhận không khớp → báo lỗi tại chỗ', async ({ page, request }) => {
    const user = await createUser(request);
    await page.goto('/forgot-password');
    await page.getByPlaceholder('Email của bạn').fill(user.email);
    await page.getByRole('button', { name: /Gửi yêu cầu/ }).click();
    await page.getByPlaceholder('Mật khẩu mới').fill('Khop-Khong-1');
    await page.getByPlaceholder('Xác nhận mật khẩu').fill('Khac-Han-2');
    await page.getByRole('button', { name: /Xác nhận đổi mật khẩu/ }).click();
    await expect(page.getByText('Mật khẩu không khớp')).toBeVisible();
  });
});
