import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  localEmbedder,
  toPgVector,
} from '@mynook/embedding';

/**
 * Sinh vector ngữ nghĩa cho câu tìm kiếm.
 * Chạy model all-MiniLM-L6-v2 cục bộ (lib @mynook/embedding) thay HuggingFace
 * Inference API — spec 018, LOG-001. Interface giữ nguyên cho nơi gọi.
 */
@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);

  onModuleInit() {
    this.logger.log(
      `EmbeddingService: local model ${EMBEDDING_MODEL} (dim ${EMBEDDING_DIM}) — loading in background`,
    );
    // Nạp model ngầm để lượt tìm kiếm đầu không phải chờ; lỗi chỉ log, lần gọi sau thử lại.
    const t = Date.now();
    localEmbedder
      .warmup()
      .then(() => this.logger.log(`Embedding model ready in ${Date.now() - t}ms`))
      .catch((err) => this.logger.warn(`Embedding model warmup failed (will retry on demand): ${err}`));
  }

  /** The dimensionality of the embedding vectors */
  get dimension(): number {
    return EMBEDDING_DIM;
  }

  /** Vector 384 chiều cho một văn bản. Ném lỗi nếu model không nạp được. */
  async embed(text: string): Promise<number[]> {
    try {
      return await localEmbedder.embed(text);
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error}`);
      throw error;
    }
  }

  /** Vector cho nhiều văn bản. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await localEmbedder.embedBatch(texts);
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error}`);
      throw error;
    }
  }

  /** Format a vector as a pgvector-compatible string: '[0.1,0.2,...]' */
  toPgVector(vector: number[]): string {
    return toPgVector(vector);
  }
}
