import { test, expect } from '@playwright/test';
import { createUser } from '../support/auth';
import { createTestVenue, postReview, waitFor } from '../support/ai-api';
import { reviewAnalysis, venueAiState } from '../support/ai-db';
import { queueState } from '../support/rmq';

/**
 * Spec 018 — phân tích review.
 *  - AC-3.1 (@groq): review mới → gpt-oss-120b phân tích → lưu ai_analysis_json, tăng tag quán.
 *  - AC-3.3 (@failure, chạy ở lượt E2E_AI_FAILURE=1 với GROQ_REVIEW_MODEL sai):
 *    AI lỗi → message được bỏ qua, KHÔNG nack + requeue lặp lại.
 */
const REVIEW_TEXT =
  'Quán rất yên tĩnh vào buổi sáng, cà phê ngon đậm vị, nhân viên thân thiện và nhiệt tình. ' +
  'Không gian sạch sẽ, có wifi mạnh để làm việc. Giá hơi cao một chút nhưng xứng đáng.';

test('AC-3.1: review mới được AI phân tích, tag quán tăng @groq', async ({ request }) => {
  const { venue } = await createTestVenue(request, { label: 'Cafe review', description: 'Quán cà phê nhỏ.' });
  const before = (await venueAiState(venue.id))?.tagCount ?? 0;

  const customer = await createUser(request, 'customer');
  const review = await postReview(request, customer, venue.id, REVIEW_TEXT, 5);

  const analysis = await waitFor(async () => (await reviewAnalysis(review.id)).analysis, 90_000, 3_000);
  expect(analysis, 'AC-3.1: review phải có ai_analysis_json').toBeTruthy();
  const a = analysis as { sentiment?: string; positive_tags?: string[] };
  expect(['positive', 'mixed', 'neutral', 'negative']).toContain(a.sentiment);
  expect(a.positive_tags?.length ?? 0).toBeGreaterThan(0);

  const after = await waitFor(async () => {
    const n = (await venueAiState(venue.id))?.tagCount ?? 0;
    return n > before ? n : 0;
  }, 20_000, 2_000);
  expect(after, 'tag của quán phải tăng sau khi review được phân tích').toBeGreaterThan(before);
  test.info().annotations.push({ type: 'phân tích', description: JSON.stringify(a) });
});

test('AC-3.3: model review không tồn tại → bỏ qua, không lặp hàng đợi, review vẫn còn @failure', async ({ request }) => {
  const { venue } = await createTestVenue(request, { label: 'Cafe failure', description: 'Quán cà phê nhỏ.' });
  const customer = await createUser(request, 'customer');
  const before = await queueState('search_ai_queue');

  const review = await postReview(request, customer, venue.id, REVIEW_TEXT, 4);

  // Chờ search-ai xử lý (gọi Groq → 404 → ReviewAnalysisFailedError → ack)
  await new Promise((r) => setTimeout(r, 15_000));
  const after = await queueState('search_ai_queue');

  expect(after.messages, 'không còn message chờ').toBe(0);
  expect(after.unacked, 'không còn message đang giữ').toBe(0);
  expect(after.redeliver - before.redeliver, 'AC-3.3: không có lần giao lại nào (không nack + requeue)').toBe(0);

  const state = await reviewAnalysis(review.id);
  expect(state.exists, 'review vẫn tồn tại').toBe(true);
  expect(state.analysis, 'review chưa có phân tích — để backfill sau').toBeNull();
});
