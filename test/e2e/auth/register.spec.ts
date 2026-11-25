import { test, expect } from '@playwright/test';
import {
  ACCESS_COOKIE, TEST_PASSWORD, createUser, getCookie, otpInputs, sendOtp, typeOtp,
  uniqueEmail, verifyOtp,
} from '../../support/auth';
import { getAccount } from '../../support/db';
import { API_URL } from '../../support/env';
import { waitForEmail } from '../../support/mailpit';

/** Spec 001 — US-1: Đăng ký bằng email + OTP */
test.describe('US-1 Đăng ký bằng email + OTP', () => {
  test('AC-1.1 + AC-1.3 + AC-1.6: khách hàng đăng ký qua giao diện, nhập đúng OTP → đăng nhập và về trang chủ', async ({ page }) => {
    const email = uniqueEmail('ui-register');
    await page.goto('/register');
    await page.locator('#name').fill('E2E Khách');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(TEST_PASSWORD);

    const otpResponse = page.waitForResponse((r) => r.url().endsWith('/auth/send-otp'));
    await page.getByRole('button', { name: 'Create Account' }).click();
    const sent = await otpResponse;
    expect(sent.status()).toBe(201);
    const { dev_otp, message } = await sent.json();
    expect(dev_otp).toMatch(/^\d{6}$/);           // mã 6 chữ số
    expect(message).toContain('OTP');

    await expect(page.getByText('Xác thực email')).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await typeOtp(page, dev_otp);                   // ô thứ 6 tự submit
    await expect(page.getByText('Đăng ký thành công!')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await getCookie(page, ACCESS_COOKIE)).toBeTruthy();

    const account = await getAccount(email);
    expect(account).toMatchObject({ email, type: 'customer', is_active: true, full_name: 'E2E Khách' });
  });

  test('AC-1.2: email đã có tài khoản → "Email đã được sử dụng", không sang bước OTP', async ({ page, request }) => {
    const user = await createUser(request);
    await page.goto('/register');
    await page.locator('#name').fill('Trùng email');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Email đã được sử dụng')).toBeVisible();
    await expect(otpInputs(page)).toHaveCount(0);
  });

  test('AC-1.4: nhập sai OTP → báo lỗi và xoá trắng 6 ô', async ({ page }) => {
    const email = uniqueEmail('wrong-otp');
    await page.goto('/register');
    await page.locator('#name').fill('Sai OTP');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(TEST_PASSWORD);
    const otpResponse = page.waitForResponse((r) => r.url().endsWith('/auth/send-otp'));
    await page.getByRole('button', { name: 'Create Account' }).click();
    const { dev_otp } = await (await otpResponse).json();

    const wrong = dev_otp === '000000' ? '111111' : '000000';
    await typeOtp(page, wrong);
    await expect(page.getByText('Mã OTP không đúng hoặc đã hết hạn')).toBeVisible();
    for (let i = 0; i < 6; i++) await expect(otpInputs(page).nth(i)).toHaveValue('');
    expect(await getAccount(email)).toBeNull();
  });

  test('AC-1.4 (API): mã sai → 400 "Mã OTP không hợp lệ hoặc đã hết hạn"', async ({ request }) => {
    const email = uniqueEmail('api-wrong-otp');
    const sent = await sendOtp(request, { email, password: TEST_PASSWORD });
    const { dev_otp } = await sent.json();
    const res = await verifyOtp(request, email, dev_otp === '000000' ? '111111' : '000000');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Mã OTP không hợp lệ hoặc đã hết hạn');
  });

  test('AC-1.5: yêu cầu mã mới → mã cũ không còn dùng được, mã mới dùng được', async ({ request }) => {
    const email = uniqueEmail('resend');
    const first = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    let second = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    // Xác suất rất nhỏ hai mã trùng nhau — gửi lại cho chắc chắn khác
    while (second.dev_otp === first.dev_otp) {
      second = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    }
    const old = await verifyOtp(request, email, first.dev_otp);
    expect(old.status()).toBe(400);
    const fresh = await verifyOtp(request, email, second.dev_otp);
    expect(fresh.status()).toBe(201);
  });

  test('AC-1.1 (API): mật khẩu dưới 6 ký tự bị từ chối', async ({ request }) => {
    const res = await sendOtp(request, { email: uniqueEmail('short-pw'), password: '12345' });
    expect(res.status()).toBe(400);
  });

  test('AC-1.6 (API): đăng ký vai trò chủ quán → tài khoản type owner', async ({ request }) => {
    const owner = await createUser(request, 'owner');
    expect(await getAccount(owner.email)).toMatchObject({ type: 'owner' });
  });

  test('AC-1.1 (UI): mặc định chọn sẵn vai trò Khách hàng', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('group', { name: 'Bạn là' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Khách hàng/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Chủ quán/ })).not.toBeChecked();
  });

  test('AC-1.1 + AC-1.6 (UI): chọn Chủ quán → OTP → chuyển tới /dashboard, tài khoản type owner', async ({ page }) => {
    const email = uniqueEmail('ui-owner');
    await page.goto('/register');
    await page.getByText('Chủ quán', { exact: true }).click();
    await expect(page.getByRole('radio', { name: /Chủ quán/ })).toBeChecked();

    await page.locator('#name').fill('E2E Chủ quán');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(TEST_PASSWORD);

    const otpResponse = page.waitForResponse((r) => r.url().endsWith('/auth/send-otp'));
    await page.getByRole('button', { name: 'Create Account' }).click();
    const sent = await otpResponse;
    expect(sent.request().postDataJSON()).toMatchObject({ type: 'owner' });
    const { dev_otp } = await sent.json();

    await expect(page.getByText('Đăng ký với vai trò:')).toBeVisible();
    await expect(page.getByText('Chủ quán', { exact: true })).toBeVisible();

    await typeOtp(page, dev_otp);
    await expect(page.getByText('Đăng ký thành công!')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await getAccount(email)).toMatchObject({ type: 'owner' });
  });

  test('AC-1.1 (email): mã OTP được gửi tới đúng hộp thư và trùng mã hệ thống tạo', async ({ request }) => {
    const email = uniqueEmail('otp-mail');
    const sent = await sendOtp(request, { email, password: TEST_PASSWORD, full_name: 'E2E Mail' });
    expect(sent.status()).toBe(201);
    const { dev_otp } = await sent.json();

    const mail = await waitForEmail(email, 'Mã xác thực');
    expect(mail.Text).toContain(dev_otp);
    expect(mail.HTML).toContain(dev_otp);
  });

  test('GAP-6: nhập sai 5 lần → mã bị huỷ, mã đúng cũng không dùng được nữa', async ({ request }) => {
    const email = uniqueEmail('otp-attempts');
    const { dev_otp } = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    const wrong = dev_otp === '000000' ? '111111' : '000000';

    for (let i = 1; i <= 4; i++) {
      const r = await verifyOtp(request, email, wrong);
      expect(r.status()).toBe(400);
      expect((await r.json()).message).toBe('Mã OTP không hợp lệ hoặc đã hết hạn');
    }
    const fifth = await verifyOtp(request, email, wrong);
    expect(fifth.status()).toBe(400);
    expect((await fifth.json()).message).toBe('Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới');

    const correctAfter = await verifyOtp(request, email, dev_otp);
    expect(correctAfter.status(), 'mã đúng sau 5 lần sai vẫn bị từ chối').toBe(400);
    expect(await getAccount(email)).toBeNull();

    // Yêu cầu mã mới thì đăng ký lại được bình thường
    const fresh = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    expect((await verifyOtp(request, email, fresh.dev_otp)).status()).toBe(201);
  });

  test('GAP-6: nhập sai ít hơn 5 lần rồi nhập đúng → vẫn đăng ký được', async ({ request }) => {
    const email = uniqueEmail('otp-retry');
    const { dev_otp } = await (await sendOtp(request, { email, password: TEST_PASSWORD })).json();
    const wrong = dev_otp === '000000' ? '111111' : '000000';
    for (let i = 0; i < 3; i++) expect((await verifyOtp(request, email, wrong)).status()).toBe(400);
    expect((await verifyOtp(request, email, dev_otp)).status()).toBe(201);
  });

  test('GAP-2: đường đăng ký không qua OTP đã bị gỡ khỏi gateway (404)', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/register`, {
      data: { email: uniqueEmail('no-otp'), password: TEST_PASSWORD, full_name: 'Không OTP' },
    });
    expect(res.status()).toBe(404);
  });

  test('AC-5.3: không thể tự đăng ký vai trò admin', async ({ request }) => {
    const res = await sendOtp(request, { email: uniqueEmail('admin-try'), password: TEST_PASSWORD, type: 'admin' });
    expect(res.status()).toBe(400);
  });
});
