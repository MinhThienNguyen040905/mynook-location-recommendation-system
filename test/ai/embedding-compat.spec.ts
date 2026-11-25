import { test, expect } from '@playwright/test';
import { LocalEmbedder, EMBEDDING_DIM } from '../../libs/embedding/src/index';
import { sampleVenuesWithEmbedding } from '../support/ai-db';

/**
 * Spec 018 AC-2.3, AC-2.4 — vector sinh CỤC BỘ phải tương thích vector đã lưu (sinh trước đây
 * bằng HuggingFace Inference API). Không gọi dịch vụ ngoài, không tốn hạn mức.
 */
const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / Math.sqrt(na * nb);
};

test.describe('AC-2.3 Vector cục bộ tương thích vector cũ', () => {
  test('5 quán ngẫu nhiên: cosine(vector mới, vector đã lưu) ≥ 0,99, đủ 384 chiều', async () => {
    const venues = await sampleVenuesWithEmbedding(5);
    expect(venues.length).toBe(5);

    const embedder = new LocalEmbedder();
    for (const v of venues) {
      const fresh = await embedder.embed(v.search_document);
      expect(fresh.length).toBe(EMBEDDING_DIM);
      const sim = cosine(fresh, v.embedding);
      test.info().annotations.push({ type: 'cosine', description: `${sim.toFixed(5)} — ${v.name}` });
      expect(sim, `Vector lệch ở quán "${v.name}"`).toBeGreaterThanOrEqual(0.99);
    }
  });

  test('embedBatch cho cùng kết quả với embed từng câu', async () => {
    const embedder = new LocalEmbedder();
    const texts = ['quán cà phê yên tĩnh', 'lẩu nướng cho nhóm đông người'];
    const batch = await embedder.embedBatch(texts);
    for (let i = 0; i < texts.length; i++) {
      expect(cosine(batch[i], await embedder.embed(texts[i]))).toBeGreaterThan(0.9999);
    }
  });
});
