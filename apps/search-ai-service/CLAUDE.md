# CLAUDE.md — search-ai-service

## Overview

NestJS HTTP microservice chạy ở **port 3005**. Xử lý logic tìm kiếm hybrid (semantic + tag-based), AI review processing, và embedding generation. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- **AI-powered Hybrid Search**: Mỗi query tìm kiếm → gọi Groq extract `{ intent, possible_name, categories, tags, excluded_tags, location, require_high_rating, time_context, confidence }`. Ranking hợp nhất: semantic vector (pgvector) + fuzzy name (pg_trgm + unaccent) + matched-tag SUM + category boost + rating − excluded_tag penalty. Chiến lược weights thay đổi theo intent (`name` / `attribute` / `mixed` / `unclear`).
- **Query Cache + Single-Flight**: LRU 5000 entries, TTL 60 phút, key = normalized query. Các request concurrent cùng query share 1 Groq call.
- **CategoryTagProvider**: Cache 5 phút cho danh sách active categories + top-100 tags theo `usage_count` — dùng để dựng prompt cho Groq và validate key khi Groq trả kết quả (filter out key không tồn tại trong DB).
- **Graceful Degradation**: Nếu Groq fail/timeout → FALLBACK_EXTRACTION (intent='unclear') → search vẫn chạy bằng semantic-only. Nếu search với strict filters < 5 kết quả → auto retry với relaxed filters (bỏ hard category/rating, bỏ minNameScore).
- **AI Review Processing**: Nhận event `venue.reviewed` từ interaction-service qua RabbitMQ, phân tích review bằng Groq AI (sentiment, tag extraction), upsert VenueTag scores
- **Embedding Generation**: Sử dụng HuggingFace API (all-MiniLM-L6-v2, 384 dimensions) để tạo vector embeddings
- Quản lý tags và search logs

## Key Files

| File | Mô tả |
|------|-------|
| `src/main.ts` | Bootstrap — HTTP server + RMQ consumer (`search_ai_queue`) |
| `src/app/app.module.ts` | Root module — import SearchModule, ReviewProcessingModule |
| **Search Module** | |
| `src/app/modules/search/search.module.ts` | Search feature module |
| `src/app/modules/search/search.controller.ts` | `GET /search?q=&limit=&offset=&debug=` — AI hybrid search endpoint |
| `src/app/modules/search/search-parser.service.ts` | Regex pre-parse (capacity "5 người", time "buổi tối") — chạy trước Groq |
| `src/app/modules/search/embedding.service.ts` | HuggingFace API → 384-dim vector embeddings |
| `src/app/modules/search/query-extraction.service.ts` | Groq call: intent + possible_name + categories + tags + excluded_tags + location + require_high_rating + time_context. Có timeout 3.5s + sanitize output (drop unknown keys). |
| `src/app/modules/search/query-cache.service.ts` | LRU + single-flight cho extract() — chống thundering herd |
| `src/app/modules/search/category-tag-provider.service.ts` | Load + cache 5 phút: active categories + top-100 tags theo `usage_count`. Resolve keys → ids cho SQL. |
| `src/app/modules/search/venue-search.service.ts` | Hybrid SQL: semantic + pg_trgm name + matched-tag SUM + category boost + rating, dynamic weights theo intent, fallback khi ít kết quả |
| **Review Processing Module** | |
| `src/app/modules/review-processing/review-processing.module.ts` | AI review processing module |
| `src/app/modules/review-processing/review-processing.controller.ts` | RMQ handler for `venue.reviewed` event |
| `src/app/modules/review-processing/review-processing.service.ts` | Process review: Groq AI analysis → upsert VenueTag scores (transaction) |
| `src/app/modules/review-processing/groq-ai.service.ts` | Groq SDK integration (Llama 3.3) — sentiment, tag extraction, time context |

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/search?q=...&limit=20` | Optional (via headers) | Hybrid venue search |

## RabbitMQ Events

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `venue.reviewed` | **Consumes** (from interaction-service) | Triggers AI analysis of new review |

After processing a review, search-ai-service calls back to interaction-service via HTTP:
`PATCH /reviews/:reviewId/ai-analysis` to save the AI analysis JSON.

## Database Entities

- `Tag`, `VenueTag`, `SearchLog`, `Venue`, `Category`, `VenueCategory` (từ `@mynook/database`)
- `Venue.embedding`: pgvector `vector(384)` column with HNSW index
- `Tag.usage_count`: int column sort để lấy top-100 tags phổ biến cho Groq prompt (seed từ migration 007 dựa trên venue_tags hiện có; cần cập nhật định kỳ)
- `venue_schema.categories` / `venue_schema.venue_categories`: master list + M:N junction. search-ai-service CHỈ ĐỌC; CRUD nằm ở venue-service.
- Trigram indexes (pg_trgm + unaccent) trên `venues.name`, `venues.branch_name`, `venues.address` cho fuzzy match tên / địa chỉ

## Hybrid Search Algorithm (AI-powered)

1. **Regex parse** → extract `capacity`, `timeContext` từ query (fast, zero-dep)
2. **PARALLEL**: gọi Groq extract intent + embedding HuggingFace — tận dụng `Promise.all` để giảm latency
3. **Resolve**: map keys Groq trả về → ids (filter out key không tồn tại trong DB)
4. **buildStrategy(intent)** — chọn weights + hard filters:

| Intent | nameW | semW | tagW | catBoost | ratingW | hardCat | hardRating | minNameScore |
|---|---|---|---|---|---|---|---|---|
| name | 0.70 | 0.10 | 0.10 | 0 | 0.10 | ❌ | if require | 0.30 |
| attribute | 0 | 0.40 | 0.40 | 0.10 | 0.10 | if conf=high | if require | null |
| mixed | 0.40 | 0.20 | 0.20 | 0.10 | 0.10 | ❌ | if require | null |
| unclear | 0.20 | 0.50 | 0.20 | 0 | 0.10 | ❌ | ❌ | null |

5. **SQL hybrid query**:
   - Semantic: `1 - LEAST(v.embedding <=> $vec, 1.0)` (NULL-safe — venue thiếu embedding → 0)
   - Matched-tag score: `SUM(vt.score)` CHỈ của tags match query, lọc theo `time_frame` (hoặc `all_day`). Chia cho 3 và cap 1.0.
   - Name score: `GREATEST(similarity(unaccent(lower(name)), unaccent(lower($name))), similarity(branch_name, $name))` qua pg_trgm
   - Category boost: `EXISTS` check trong `venue_categories`
   - Excluded tags: trừ thẳng `0.15 * excluded_tag_score` (penalty)
   - Hard filters: `is_active`, `crowd_level != 'full'`, optional `max_group_size`, optional category, optional rating ≥ 4.0, optional minNameScore, optional location ILIKE
6. **Relaxation fallback**: nếu < 5 kết quả và đang áp dụng filter cứng → re-run với filters relaxed
7. **Debug mode**: `?debug=1` → response kèm `score_breakdown { semantic, tag, name, category_match, rating, strategy }`

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3005
GROQ_API_KEY=gsk_...              # Groq AI cho review analysis + search query extraction. Nếu thiếu → search fallback về semantic-only
HUGGINGFACE_API_TOKEN=hf_...      # HuggingFace cho embeddings (optional, hoạt động không token với public models)
INTERACTION_SERVICE_URL=http://localhost:3004  # cho AI analysis callback
```

## Groq Usage (2 nơi)

| Use case | Model | Module | Trigger |
|---|---|---|---|
| Query extraction | `llama-3.1-8b-instant` | search/query-extraction.service.ts | Mỗi search request (cache miss) |
| Review analysis | `llama-3.3-70b-versatile` | review-processing/groq-ai.service.ts | Event RMQ `venue.reviewed` |

## Conventions

- Mỗi feature mới tạo module riêng trong `modules/<feature>/`
- RMQ event handlers dùng manual ACK (`noAck: false`)
- Database transactions dùng `queryRunner` cho upsert operations
- AI service calls wrapped trong try/catch — không fail nếu AI không available
