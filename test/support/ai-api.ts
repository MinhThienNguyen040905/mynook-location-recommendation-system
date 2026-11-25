import { expect, type APIRequestContext } from '@playwright/test';
import { API_URL } from './env';
import { createUser, type TestUser } from './auth';
import { categoryIdByKey, districtByName, testVenueName } from './ai-db';

/** Chủ quán test tạo một quán `E2E-AI …` qua gateway (đi qua đúng pipeline: vector + tag mô tả). */
export async function createTestVenue(
  api: APIRequestContext,
  opts: { label: string; description: string; categoryKey?: string; owner?: TestUser },
) {
  const owner = opts.owner ?? (await createUser(api, 'owner'));
  const district = await districtByName('Thủ Đức');
  expect(district, 'Không tìm thấy quận Thủ Đức trong DB').toBeTruthy();
  const categoryId = await categoryIdByKey(opts.categoryKey ?? 'cafe');

  const name = testVenueName(opts.label);
  const res = await api.post(`${API_URL}/venues`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: {
      name,
      description: opts.description,
      address_line: '1 Đường Thử Nghiệm',
      city_id: district!.city_id,
      district_id: district!.id,
      latitude: 10.8505,
      longitude: 106.7717,
      max_group_size: 8,
      category_ids: categoryId ? [categoryId] : [],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const venue = (await res.json()) as { id: string; name: string };
  return { venue, owner };
}

export async function postReview(
  api: APIRequestContext,
  author: TestUser,
  venueId: string,
  content: string,
  rating = 5,
) {
  const res = await api.post(`${API_URL}/reviews`, {
    headers: { Authorization: `Bearer ${author.accessToken}` },
    data: { venue_id: venueId, rating, content },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { id: string };
}

/** Lặp `check` tới khi trả về giá trị truthy hoặc hết thời gian. */
export async function waitFor<T>(check: () => Promise<T>, timeoutMs: number, intervalMs = 2000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T = await check();
  while (!last && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    last = await check();
  }
  return last;
}
