import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { API_URL } from './env';

export const TEST_PASSWORD = 'E2e-Pass-123';
export const ACCESS_COOKIE = 'mynook_access_token';
export const REFRESH_COOKIE = 'mynook_refresh_token';

export type Role = 'customer' | 'owner';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  type: Role;
  accessToken: string;
  refreshToken: string;
}

/** Email test duy nhất — db.ts chỉ cho phép ghi / xoá email dạng này. */
export function uniqueEmail(tag = 'user'): string {
  return `e2e+${tag}-${Date.now()}-${randomBytes(3).toString('hex')}@mynook.test`;
}

export async function sendOtp(
  api: APIRequestContext,
  body: { email: string; password: string; full_name?: string; type?: string },
) {
  return api.post(`${API_URL}/auth/send-otp`, { data: body });
}

export async function verifyOtp(api: APIRequestContext, email: string, otp: string) {
  return api.post(`${API_URL}/auth/verify-otp`, { data: { email, otp } });
}

/** Tạo tài khoản qua đúng luồng OTP (môi trường dev trả `dev_otp` trong phản hồi). */
export async function createUser(
  api: APIRequestContext,
  type: Role = 'customer',
  password = TEST_PASSWORD,
): Promise<TestUser> {
  const email = uniqueEmail(type);
  const fullName = `E2E ${type}`;
  const sent = await sendOtp(api, { email, password, full_name: fullName, type });
  expect(sent.status(), await sent.text()).toBe(201);
  const { dev_otp } = await sent.json();
  expect(dev_otp, 'Không nhận được dev_otp — auth-service phải chạy với NODE_ENV khác production').toMatch(/^\d{6}$/);

  const verified = await verifyOtp(api, email, dev_otp);
  expect(verified.status(), await verified.text()).toBe(201);
  const body = await verified.json();
  return {
    email,
    password,
    fullName,
    type,
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
  };
}

export async function apiLogin(api: APIRequestContext, email: string, password: string) {
  return api.post(`${API_URL}/auth/login`, { data: { email, password } });
}

/** Đăng nhập qua giao diện, chờ chuyển trang xong. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Đăng nhập thành công!')).toBeVisible();
}

export async function getCookie(page: Page, name: string): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === name)?.value;
}

export function otpInputs(page: Page) {
  return page.locator('input[inputmode="numeric"]');
}

/** Gõ 6 chữ số OTP vào 6 ô (ô cuối tự submit). */
export async function typeOtp(page: Page, otp: string): Promise<void> {
  const inputs = otpInputs(page);
  await expect(inputs).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(otp[i]);
  }
}
