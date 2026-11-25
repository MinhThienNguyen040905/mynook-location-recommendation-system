import { test, expect } from '@playwright/test';
import { ACCESS_COOKIE, REFRESH_COOKIE, TEST_PASSWORD, apiLogin, createUser, getCookie, loginViaUi } from '../../support/auth';
import { setAccountActive } from '../../support/db';
import { API_URL } from '../../support/env';

/** Spec 001 — US-2: Đăng nhập & giữ phiên */
test.describe('US-2 Đăng nhập', () => {
  test('AC-2.1: khách hàng đăng nhập → về trang chủ, có cookie phiên', async ({ page, request }) => {
    const user = await createUser(request, 'customer');
    await loginViaUi(page, user.email, user.password);
    await expect(page).toHaveURL(/\/$/);
    expect(await getCookie(page, ACCESS_COOKIE)).toBeTruthy();
    expect(await getCookie(page, REFRESH_COOKIE)).toBeTruthy();
  });

  test('AC-2.1: chủ quán đăng nhập → chuyển tới /dashboard', async ({ page, request }) => {
    const owner = await createUser(request, 'owner');
    await loginViaUi(page, owner.email, owner.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('AC-2.2: sai mật khẩu và email không tồn tại → cùng một thông báo chung', async ({ page, request }) => {
    const user = await createUser(request);

    const wrongPw = await apiLogin(request, user.email, 'sai-mat-khau');
    const noUser = await apiLogin(request, `e2e+khong-ton-tai-${Date.now()}@mynook.test`, TEST_PASSWORD);
    expect(wrongPw.status()).toBe(401);
    expect(noUser.status()).toBe(401);
    expect((await wrongPw.json()).message).toBe('Email hoặc mật khẩu không đúng');
    expect((await noUser.json()).message).toBe((await wrongPw.json()).message);

    await page.goto('/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill('sai-mat-khau');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('AC-2.3 (API): tài khoản bị khoá → không đăng nhập, không làm mới phiên được', async ({ request }) => {
    const user = await createUser(request);
    await setAccountActive(user.email, false);

    const login = await apiLogin(request, user.email, user.password);
    expect(login.status()).toBe(401);
    const loginBody = await login.json();
    expect(loginBody.message).toBe('Tài khoản đã bị vô hiệu hóa');
    expect(loginBody.error_code).toBe('ACCOUNT_DISABLED');

    const refresh = await request.post(`${API_URL}/auth/refresh`, { data: { refresh_token: user.refreshToken } });
    expect(refresh.status()).toBe(401);
    expect((await refresh.json()).error_code).toBe('ACCOUNT_DISABLED');
  });

  test('AC-2.3 (UI): tài khoản bị khoá → giao diện báo tài khoản đã bị khoá', async ({ page, request }) => {
    const user = await createUser(request);
    await setAccountActive(user.email, false);
    await page.goto('/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.')).toBeVisible();
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test('AC-2.2 + AC-2.3: tài khoản bị khoá nhưng sai mật khẩu → chỉ nhận thông báo chung (không lộ trạng thái)', async ({ page, request }) => {
    const user = await createUser(request);
    await setAccountActive(user.email, false);

    const res = await apiLogin(request, user.email, 'sai-mat-khau');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toBe('Email hoặc mật khẩu không đúng');
    expect(body.error_code).toBeUndefined();

    await page.goto('/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill('sai-mat-khau');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
  });

  test('AC-2.6: đã đăng nhập mở /login → được chuyển về trang chủ', async ({ page, request }) => {
    const user = await createUser(request);
    await loginViaUi(page, user.email, user.password);
    await page.goto('/login');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
