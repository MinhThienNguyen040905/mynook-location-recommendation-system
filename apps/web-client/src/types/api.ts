/** Standard paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/** Standard API error response */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
