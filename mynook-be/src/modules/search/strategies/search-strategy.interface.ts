/**
 * ISearchStrategy — Interface for Factory Method pattern.
 * Concrete strategies: VectorSearchStrategy, NlpSearchStrategy, HybridSearchStrategy
 */
export interface ISearchStrategy {
  execute(query: string, options?: Record<string, unknown>): Promise<unknown[]>;
}
