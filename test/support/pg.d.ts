// Khai báo tối thiểu cho `pg` (repo không có @types/pg) — chỉ phục vụ typecheck của bộ test.
declare module 'pg' {
  export interface QueryResult<R = any> {
    rows: R[];
    rowCount: number | null;
  }
  export class Client {
    constructor(config: { connectionString: string; ssl?: unknown });
    connect(): Promise<void>;
    query<R = any>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
