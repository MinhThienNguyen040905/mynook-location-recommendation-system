import { test, expect } from '@playwright/test';
import { createTestVenue, waitFor } from '../support/ai-api';
import { venueAiState } from '../support/ai-db';

/**
 * Spec 018 AC-2.2, AC-3.2 — quán mới: vector sinh cục bộ trong ≤ 30 s, tag khởi đầu
 * từ mô tả (gpt-oss-20b, qua sự kiện RabbitMQ venue.created). @groq: tốn hạn mức.
 */
test('AC-2.2 + AC-3.2: tạo quán có mô tả → có vector ≤ 30 s và có tag từ mô tả @groq', async ({ request }) => {
  const { venue } = await createTestVenue(request, {
    label: 'Cafe pipeline',
    description:
      'Quán cà phê yên tĩnh, không gian rộng rãi thoáng mát, nhân viên thân thiện, giá cả phải chăng, ' +
      'có chỗ ngồi làm việc với wifi mạnh và ổ cắm, phù hợp đi nhóm bạn.',
  });

  const withVector = await waitFor(async () => (await venueAiState(venue.id))?.hasEmbedding, 30_000, 1_000);
  expect(withVector, 'AC-2.2: quán mới phải có vector trong 30 giây').toBe(true);

  const tagCount = await waitFor(async () => (await venueAiState(venue.id))?.tagCount ?? 0, 60_000, 2_000);
  expect(tagCount, 'AC-3.2: quán có mô tả phải được gắn tag khởi đầu').toBeGreaterThan(0);
  test.info().annotations.push({ type: 'tag', description: `${tagCount} tag từ mô tả` });
});
