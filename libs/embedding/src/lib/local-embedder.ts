/**
 * Sinh vector ngữ nghĩa CỤC BỘ bằng `all-MiniLM-L6-v2` (bản ONNX `Xenova/all-MiniLM-L6-v2`).
 *
 * Thay HuggingFace Inference API (hết hạn mức miễn phí) — spec 018, LOG-001.
 * Cùng model + mean pooling + chuẩn hoá L2 = đúng cách sentence-transformers sinh vector cũ,
 * nên vector mới tương thích tuyệt đối với vector đã lưu (đã kiểm: cosine = 1,00000).
 *
 * - Model (~23 MB) tải từ HuggingFace Hub ở lần dùng đầu, sau đó dùng cache trên đĩa.
 * - Mỗi tiến trình chỉ nạp model một lần (lazy, dùng chung qua `localEmbedder`).
 * - Nạp lỗi (vd mất mạng lần đầu) → lần gọi sau thử nạp lại.
 */
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIM = 384;

export class LocalEmbedder {
  private loading: Promise<FeatureExtractionPipeline> | null = null;

  constructor(private readonly model: string = EMBEDDING_MODEL) {}

  /** Nạp model trước (gọi lúc khởi động để lần tìm kiếm đầu không bị chậm). */
  async warmup(): Promise<void> {
    await this.getPipeline();
  }

  /** Vector 384 chiều đã chuẩn hoá cho một văn bản. */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data as Float32Array);
    if (vector.length !== EMBEDDING_DIM) {
      throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${vector.length}`);
    }
    return vector;
  }

  /** Vector cho nhiều văn bản, cùng thứ tự đầu vào. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getPipeline();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist() as number[][];
  }

  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.loading) {
      this.loading = import('@huggingface/transformers')
        .then(({ pipeline }) =>
          pipeline('feature-extraction', this.model, { dtype: 'fp32' }) as Promise<FeatureExtractionPipeline>,
        )
        .catch((err: unknown) => {
          this.loading = null; // cho phép thử nạp lại ở lần gọi sau
          throw err;
        });
    }
    return this.loading;
  }
}

/** Thể hiện dùng chung trong một tiến trình — tránh nạp model nhiều lần. */
export const localEmbedder = new LocalEmbedder();

/** Định dạng vector cho pgvector: '[0.1,0.2,...]' */
export function toPgVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
