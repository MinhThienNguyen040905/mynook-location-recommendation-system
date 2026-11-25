import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { API_URL } from '../support/env';
import { deleteSearchLogs, districtByName, latestSearchLog } from '../support/ai-db';

/**
 * Spec 018 AC-1.1, AC-1.2, AC-2.1 — tìm kiếm hiểu câu tự nhiên với gpt-oss-20b + vector cục bộ.
 * @groq: tốn hạn mức. Giãn cách giữa các câu để không vượt 8.000 token / phút (gói miễn phí).
 */
interface Fixture {
  q: string;
  categories?: string[];
  district?: string;
  capacity?: number;
  timeContext?: string;
  name?: string;
}
const fixtures: Fixture[] = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/search-queries.json'), 'utf8'),
).queries;

const SPACING_MS = Number(process.env['E2E_GROQ_SPACING_MS'] ?? 15_000);
const startedAt = new Date();

test.afterAll(async () => {
  await deleteSearchLogs(fixtures.map((f) => f.q), startedAt);
});

test('AC-1.1 + AC-1.2 + AC-2.1: 10 câu mẫu được AI hiểu đúng, có điểm ngữ nghĩa, đủ nhanh @groq', async ({ request }) => {
  test.setTimeout(fixtures.length * (SPACING_MS + 30_000));
  const report: string[] = [];
  const latencies: number[] = [];
  let understood = 0;
  let semanticOk = 0;

  for (const [i, f] of fixtures.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, SPACING_MS));

    const t0 = Date.now();
    const res = await request.get(`${API_URL}/search/public`, { params: { q: f.q, debug: '1' } });
    const ms = Date.now() - t0;
    latencies.push(ms);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const top = body.results?.[0];
    const strategy: string = top?.score_breakdown?.strategy ?? '(no result)';
    if (top?.score_breakdown?.semantic > 0) semanticOk++;

    const log = await latestSearchLog(f.q, startedAt);
    const problems: string[] = [];
    if (!log) problems.push('không có search_log');
    else {
      if (log['intent'] === 'unclear' && log['confidence'] === 'low') problems.push('AI không hiểu (fallback)');
      const cats = (log['categories'] as string[]) ?? [];
      if (f.categories && !f.categories.some((c) => cats.includes(c))) problems.push(`loại quán ${JSON.stringify(cats)} ∌ ${f.categories}`);
      if (f.district) {
        const d = await districtByName(f.district);
        if (log['resolved_district_id'] !== d?.id) problems.push(`không nhận ra quận ${f.district}`);
      }
      if (f.capacity !== undefined && log['capacity'] !== f.capacity) problems.push(`số người ${log['capacity']} ≠ ${f.capacity}`);
      if (f.timeContext && log['timeContext'] !== f.timeContext) problems.push(`khung giờ ${log['timeContext']} ≠ ${f.timeContext}`);
      if (f.name && !String(log['possible_name'] ?? '').toLowerCase().includes(f.name)) problems.push(`tên "${log['possible_name']}" ∌ ${f.name}`);
    }
    if (problems.length === 0) understood++;
    report.push(`${problems.length ? '✗' : '✓'} ${ms}ms [${strategy}] "${f.q}"${problems.length ? ' — ' + problems.join('; ') : ''}`);
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1];
  test.info().annotations.push({ type: 'kết quả', description: `\n${report.join('\n')}\nhiểu đúng ${understood}/${fixtures.length}, semantic>0 ${semanticOk}/${fixtures.length}, p90 ${p90}ms` });
  console.log(report.join('\n'));
  console.log(`hiểu đúng ${understood}/${fixtures.length}, semantic>0 ${semanticOk}/${fixtures.length}, p90 ${p90}ms`);

  expect(understood, 'AC-1.1: ít nhất 8/10 câu được hiểu đúng').toBeGreaterThanOrEqual(8);
  expect(semanticOk, 'AC-2.1: mọi câu có điểm ngữ nghĩa').toBe(fixtures.length);
  expect(p90, 'AC-1.2: p90 thời gian ≤ 3,5 s (tính cả truy vấn DB)').toBeLessThanOrEqual(3_500);
});
