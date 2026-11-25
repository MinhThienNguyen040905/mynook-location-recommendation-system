import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { API_URL } from '../support/env';
import { createTestVenue } from '../support/ai-api';
import { longMenuImageUrl } from '../support/ai-db';

/**
 * Spec 018 AC-4.1–4.3 — đọc ảnh menu bằng qwen/qwen3.8-27b. @groq: tốn hạn mức.
 * Menu ngắn: test tự chụp ảnh từ HTML (8 món, giá viết tắt "25" = 25.000đ) → gửi dạng data URL.
 * Menu dài: ảnh thật của quán THÔ'S (~40 món) trong DB.
 */
const MENU_TOO_LONG = 'Menu quá dài — hãy chụp từng phần';

test.describe.serial('Đọc ảnh menu', () => {
  let ownerToken = '';
  let venueId = '';

  test.beforeAll(async ({ request }) => {
    const { venue, owner } = await createTestVenue(request, { label: 'Cafe menu', description: 'Quán cà phê nhỏ.' });
    ownerToken = owner.accessToken;
    venueId = venue.id;
  });

  test('AC-4.1 + AC-4.2: menu ngắn → đủ món, giá quy đổi nghìn đồng @groq', async ({ page, request }) => {
    await page.setViewportSize({ width: 720, height: 900 });
    await page.setContent(readFileSync(resolve(__dirname, 'fixtures/menus/short-menu.html'), 'utf8'));
    // JPEG để body JSON nhỏ (Express mặc định giới hạn 100 KB)
    const jpg = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
    const dataUrl = `data:image/jpeg;base64,${jpg.toString('base64')}`;
    expect(dataUrl.length, 'ảnh phải dưới giới hạn body 100 KB').toBeLessThan(95_000);

    const res = await request.post(`${API_URL}/venues/${venueId}/menu/analyze-image`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { image_url: dataUrl },
      timeout: 90_000,
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { categories: { name: string; items: { name: string; price: number }[] }[] };
    const items = body.categories.flatMap((c) => c.items);
    test.info().annotations.push({ type: 'menu', description: JSON.stringify(body) });

    expect(items.length, 'AC-4.1: đọc đủ 8 món').toBeGreaterThanOrEqual(7);
    const byName = (needle: string) => items.find((i) => i.name.toLowerCase().includes(needle));
    expect(byName('bạc xỉu')?.price, 'AC-4.2: "32" → 32.000').toBe(32000);
    expect(byName('đào')?.price, 'AC-4.2: "45" → 45.000').toBe(45000);
    for (const i of items) expect(i.price, `giá món "${i.name}"`).toBeGreaterThanOrEqual(1000);
  });

  test('AC-4.3: menu dài → đọc được hoặc báo "Menu quá dài", không lỗi chung @groq', async ({ request }) => {
    const url = await longMenuImageUrl();
    test.skip(!url, 'Không có ảnh menu dài trong DB');
    // Giãn khỏi lượt gọi trước: giới hạn ~1.000 token đầu ra / phút của gói miễn phí
    await new Promise((r) => setTimeout(r, 60_000));

    const res = await request.post(`${API_URL}/venues/${venueId}/menu/analyze-image`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { image_url: url },
      timeout: 90_000,
    });
    const body = await res.json();
    test.info().annotations.push({ type: 'kết quả', description: `${res.status()} ${JSON.stringify(body).slice(0, 300)}` });

    if (res.status() === 201) {
      const items = (body.categories as { items: { price: number }[] }[]).flatMap((c) => c.items);
      expect(items.length).toBeGreaterThan(10);
      for (const i of items) expect(i.price === 0 || i.price >= 1000).toBe(true);
    } else {
      expect(res.status(), 'lỗi phải là 400 có hướng dẫn, không phải 500').toBe(400);
      expect(body.message).toBe(MENU_TOO_LONG);
    }
  });
});
