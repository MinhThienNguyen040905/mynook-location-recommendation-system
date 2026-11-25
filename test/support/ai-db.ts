import { withClient } from './db';

/**
 * Helper DB cho bộ test AI (spec 018). Chỉ ĐỌC dữ liệu thật; GHI / XOÁ chỉ trên
 * quán có tên bắt đầu bằng `E2E-AI ` (và dữ liệu gắn với quán đó).
 */
export const TEST_VENUE_PREFIX = 'E2E-AI ';

export function testVenueName(label: string): string {
  return `${TEST_VENUE_PREFIX}${label} ${Date.now()}`;
}

export async function sampleVenuesWithEmbedding(n: number) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ id: string; name: string; search_document: string; emb: string }>(
      `SELECT id, name, search_document, embedding::text AS emb
         FROM venue_schema.venues
        WHERE embedding IS NOT NULL AND search_document IS NOT NULL AND is_active
          AND name NOT LIKE $1
        ORDER BY random() LIMIT $2`,
      [`${TEST_VENUE_PREFIX}%`, n],
    );
    return rows.map((r) => ({ ...r, embedding: JSON.parse(r.emb) as number[] }));
  });
}

export async function venueAiState(venueId: string) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ has_embedding: boolean; tag_count: string }>(
      `SELECT (v.embedding IS NOT NULL) AS has_embedding,
              (SELECT count(*) FROM search_schema.venue_tags vt WHERE vt.venue_id = v.id) AS tag_count
         FROM venue_schema.venues v WHERE v.id = $1`,
      [venueId],
    );
    const r = rows[0];
    return r ? { hasEmbedding: r.has_embedding, tagCount: Number(r.tag_count) } : null;
  });
}

export async function reviewAnalysis(reviewId: string) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ ai_analysis_json: unknown }>(
      'SELECT ai_analysis_json FROM interaction_schema.reviews WHERE id = $1',
      [reviewId],
    );
    return rows.length ? { exists: true, analysis: rows[0].ai_analysis_json } : { exists: false, analysis: null };
  });
}

/** Bản ghi search_logs mới nhất cho đúng câu tìm (chứa kết quả AI trích xuất). */
export async function latestSearchLog(query: string, since: Date) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ filters_used: Record<string, unknown> }>(
      `SELECT filters_used FROM search_schema.search_logs
        WHERE search_query = $1 AND created_at >= $2
        ORDER BY created_at DESC LIMIT 1`,
      [query, since],
    );
    return rows[0]?.filters_used ?? null;
  });
}

export async function districtByName(name: string) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ id: string; city_id: string }>(
      'SELECT id, city_id FROM venue_schema.districts WHERE name = $1 LIMIT 1',
      [name],
    );
    return rows[0] ?? null;
  });
}

export async function categoryIdByKey(key: string) {
  return withClient(async (c) => {
    const { rows } = await c.query<{ id: string }>('SELECT id FROM venue_schema.categories WHERE key = $1', [key]);
    return rows[0]?.id ?? null;
  });
}

/** URL ảnh menu dài có sẵn trong DB (quán THÔ'S — ~40 món) cho test giới hạn token. */
export async function longMenuImageUrl() {
  return withClient(async (c) => {
    const { rows } = await c.query<{ menu_image_url: string }>(
      `SELECT menu_image_url FROM venue_schema.venues
        WHERE name ILIKE 'THÔ%' AND menu_image_url LIKE 'https://%' LIMIT 1`,
    );
    return rows[0]?.menu_image_url ?? null;
  });
}

/** Xoá search_logs do test tạo (đúng câu tìm, sau thời điểm bắt đầu test). */
export async function deleteSearchLogs(queries: string[], since: Date) {
  return withClient((c) =>
    c.query('DELETE FROM search_schema.search_logs WHERE search_query = ANY($1) AND created_at >= $2', [queries, since]),
  );
}

/** Xoá quán test `E2E-AI …` cùng review, tag, menu, tương tác gắn với chúng. */
export async function deleteAiTestVenues(): Promise<number> {
  return withClient(async (c) => {
    await c.query('BEGIN');
    try {
      const { rows } = await c.query<{ id: string }>(
        'SELECT id FROM venue_schema.venues WHERE name LIKE $1',
        [`${TEST_VENUE_PREFIX}%`],
      );
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        await c.query('DELETE FROM interaction_schema.reviews WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM interaction_schema.user_favorites WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM interaction_schema.user_interactions WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM search_schema.venue_tags WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM venue_schema.menu_items WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM venue_schema.menu_categories WHERE venue_id = ANY($1)', [ids]);
        await c.query('DELETE FROM venue_schema.venues WHERE id = ANY($1)', [ids]);
      }
      await c.query('COMMIT');
      return ids.length;
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    }
  });
}
