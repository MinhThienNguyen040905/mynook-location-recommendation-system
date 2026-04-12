import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HfInference } from '@huggingface/inference';

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private hf!: HfInference;

  onModuleInit() {
    const token = process.env['HUGGINGFACE_API_TOKEN'] || '';
    this.hf = new HfInference(token || undefined);
    this.logger.log(
      `EmbeddingService initialized (model: ${EMBEDDING_MODEL}, dim: ${EMBEDDING_DIM})`,
    );
  }

  /** The dimensionality of the embedding vectors */
  get dimension(): number {
    return EMBEDDING_DIM;
  }

  /**
   * Generate a 384-dim embedding vector for a single text input.
   * Uses HuggingFace Inference API with all-MiniLM-L6-v2.
   */
  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
      });

      // HF returns number[] for single input
      const vector = this.flattenToArray(result);

      if (vector.length !== EMBEDDING_DIM) {
        this.logger.warn(
          `Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${vector.length}`,
        );
      }

      return vector;
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const result = await this.hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: texts,
      });

      // For batch input, result is number[][]
      if (Array.isArray(result) && Array.isArray(result[0])) {
        return (result as number[][]).map((v) => this.flattenToArray(v));
      }

      // Single result wrapped
      return [this.flattenToArray(result)];
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error}`);
      throw error;
    }
  }

  /**
   * Format a vector as a pgvector-compatible string: '[0.1,0.2,...]'
   */
  toPgVector(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  /**
   * Flatten nested arrays from HF API response to a flat number[].
   */
  private flattenToArray(data: unknown): number[] {
    if (!Array.isArray(data)) return [];
    if (typeof data[0] === 'number') return data as number[];
    // Nested — take first element (single sentence)
    return this.flattenToArray(data[0]);
  }
}
