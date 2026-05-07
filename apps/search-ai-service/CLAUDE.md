# CLAUDE.md — search-ai-service

## Overview

NestJS HTTP microservice chạy ở **port 3005**. Xử lý logic tìm kiếm hybrid (semantic + tag-based), AI review processing, và embedding generation. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- **AI-powered Hybrid Search**: Mỗi query tìm kiếm → gọi Groq extract `{ intent, possible_name, categories, tags, excluded_tags, location, require_high_rating, time_context, confidence }`. Ranking hợp nhất: semantic vector (pgvector) + fuzzy name (pg_trgm + f_unaccent) + matched-tag SUM + category boost + PostGIS distance (nếu có GPS) + rating − excluded_tag penalty. Chiến lược weights thay đổi theo intent (`name` / `attribute` / `mixed` / `unclear`).
- **LocationResolverService**: Map text location từ Groq ("Q1", "Quận 1", "q.1", "huu duyen"...) → `city_id`/`district_id` qua `aliases = ANY(...)` + trigram fallback. Cache in-process 10 phút. Nhờ đó filter theo location dùng FK equal chính xác thay vì ILIKE mơ hồ. **District resolve được scope theo `city_id`** (nếu có) để "Quận 1" trong HN không match HCM.
- **Query Cache + Single-Flight**: LRU 5000 entries, TTL 60 phút, key = normalized query. Các request concurrent cùng query share 1 Groq call.
- **CategoryTagProvider**: Cache 5 phút cho danh sách active categories + top-100 tags theo `usage_count` — dùng để dựng prompt cho Groq và validate key khi Groq trả kết quả (filter out key không tồn tại trong DB).
- **Graceful Degradation**: Nếu Groq fail/timeout → FALLBACK_EXTRACTION (intent='unclear') → search vẫn chạy bằng semantic-only. Nếu search với strict filters < 5 kết quả → auto retry với relaxed filters (bỏ hard category/rating, bỏ minNameScore).
- **AI Review Processing**: Nhận event `venue.reviewed` từ interaction-service qua RabbitMQ, phân tích review bằng Groq AI (sentiment, tag extraction), upsert VenueTag scores
- **AI Description Seed Tagging**: Nhận event `venue.created` / `venue.updated` từ venue-service (chỉ khi description non-empty), gọi Groq Llama 3.1 để rút tag keys từ top-100 candidate list, upsert seed rows vào `venue_tags` với `time_frame=all_day`, `score=0.5`, `positive_count=0`. Idempotent qua `ON CONFLICT ... DO UPDATE SET score = GREATEST(...)` — không cộng dồn khi owner edit/save lại, không hạ điểm tag mà review đã đẩy lên cao hơn floor. Mục đích: cho quán mới có signal tag trước khi có review thật.
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
| `src/app/modules/search/location-resolver.service.ts` | Resolve text location ("Q1") → `city_id`/`district_id` qua alias + trigram. Cache 10 phút. District scoped theo resolved city. |
| `src/app/modules/search/venue-search.service.ts` | Hybrid SQL: semantic + pg_trgm name + matched-tag SUM + category boost + rating + PostGIS distance (ST_Distance / ST_DWithin), dynamic weights theo intent, fallback khi ít kết quả. LEFT JOIN `cities`/`districts` để trả `city.name`/`district.name` ra FE. |
| `src/app/modules/search/recommend.service.ts` | `RecommendService.recommendForUser(accountId, limit)` — cross-schema query gom seed venues từ `user_favorites` + `reviews` (rating>=4), tính taste vector qua pgvector `AVG(embedding)::vector`, kNN exclude venues đã interact, JOIN cities/districts/primary category. Empty array khi user chưa có signal. |
| **Review Processing Module** | |
| `src/app/modules/review-processing/review-processing.module.ts` | AI review processing module |
| `src/app/modules/review-processing/review-processing.controller.ts` | RMQ handler for `venue.reviewed` event |
| `src/app/modules/review-processing/review-processing.service.ts` | Process review: Groq AI analysis → upsert VenueTag scores (transaction) |
| `src/app/modules/review-processing/groq-ai.service.ts` | Groq SDK integration (Llama 3.3) — sentiment, tag extraction, time context |
| **Description Tagging Module** | |
| `src/app/modules/description-tagging/description-tagging.module.ts` | Module imports SearchModule để dùng `CategoryTagProviderService` (candidate tag list + key→id resolver) |
| `src/app/modules/description-tagging/description-tagging.controller.ts` | RMQ handlers cho `venue.created` + `venue.updated`. Manual ACK / NACK retry vì upsert idempotent. |
| `src/app/modules/description-tagging/description-tagging.service.ts` | Cross-schema lookup categories của venue → gọi Groq → resolve keys → upsert venue_tags với `score=0.5`, `time_frame=all_day`, `positive_count=0`. `ON CONFLICT ... DO UPDATE SET score = GREATEST(...)` đảm bảo idempotency. |
| `src/app/modules/description-tagging/description-groq.service.ts` | Groq SDK (Llama 3.1, 4s timeout). Prompt khác review: trung tính, chỉ rút "tính cách" quan sát được, không sentiment, không positive/negative. Cap 8 tags/lần. |

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/search?q=...&limit=20` | Optional (via headers) | Hybrid venue search |
| GET | `/search/recommended?limit=6` | Required (`x-user-id`) | Personalized recommendations. Build taste vector = `AVG(embedding)::vector` của venues user đã favorite + reviewed `rating>=4`, kNN cosine, exclude venues user đã interact. Trả `[]` nếu user chưa có signal. |

## RabbitMQ Events

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `venue.reviewed` | **Consumes** (from interaction-service) | Triggers AI analysis of new review |
| `venue.review.deleted` | **Consumes** (from interaction-service) | Reverse venue_tag deltas using AI analysis snapshot |
| `venue.created` | **Consumes** (from venue-service) | Triggers description-based seed tagging for new venue |
| `venue.updated` | **Consumes** (from venue-service) | Re-runs description seed tagging when owner edits description |

After processing a review, search-ai-service calls back to interaction-service via HTTP:
`PATCH /reviews/:reviewId/ai-analysis` to save the AI analysis JSON. Description-tagging has no callback — seed rows live entirely in `search_schema.venue_tags`.

The consumer subscribes to routing key `venue.*` (main.ts), so all four events land in the same `search_ai_queue` and dispatch by `@EventPattern()` to the appropriate controller.

## Database Entities

- `Tag`, `VenueTag`, `SearchLog`, `Venue`, `Category`, `VenueCategory`, `City`, `District` (từ `@mynook/database`)
- `Venue.embedding`: pgvector `vector(384)` column with HNSW index
- `Venue.location`: PostGIS `geography(Point, 4326)` GENERATED từ `(longitude, latitude)`. Index GIST để `ST_DWithin` + `ST_Distance` nhanh.
- `Venue.city_id` / `Venue.district_id`: FK → `cities` / `districts`. Index B-tree.
- `Tag.usage_count`: int column sort để lấy top-100 tags phổ biến cho Groq prompt. Migration 010 thêm trigger `trg_venue_tags_bump_usage` tự cập nhật trên mọi insert/update/delete `venue_tags` → list top-100 luôn fresh, không cần cron.
- `venue_schema.categories` / `venue_schema.venue_categories`: master list + M:N junction. search-ai-service CHỈ ĐỌC; CRUD nằm ở venue-service.
- `venue_schema.cities` / `venue_schema.districts`: master tables với `aliases text[]` + `centroid geography(Point, 4326)`. search-ai-service CHỈ ĐỌC qua `LocationResolverService`.
- Trigram indexes (pg_trgm + `public.f_unaccent`) trên `venues.name`, `venues.branch_name`, `venues.address_line`, `cities.name`, `districts.name` cho fuzzy match. LƯU Ý: phải dùng wrapper `public.f_unaccent` (IMMUTABLE) trong query — không dùng `unaccent()` trực tiếp — để planner pick được index.

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

5. **Location resolution**: LocationResolver map `location.city`/`location.district` text → `city_id`/`district_id` (alias exact + trigram). Dùng để filter cứng bằng FK equal.
6. **SQL hybrid query**:
   - Semantic: `1 - LEAST(v.embedding <=> $vec, 1.0)` (NULL-safe — venue thiếu embedding → 0)
   - Matched-tag score: `SUM(vt.score)` CHỈ của tags match query, lọc theo `time_frame` (hoặc `all_day`). Chia cho 3 và cap 1.0.
   - Name score: `GREATEST(similarity(public.f_unaccent(lower(name)), public.f_unaccent(lower($name))), similarity(branch_name, $name))` qua pg_trgm
   - Category boost: `EXISTS` check trong `venue_categories`
   - **Distance score** (khi FE gửi `lat`/`lng`): `1 / (1 + d/1500)` → 1.0 tại user point, ~0.5 tại 1.5km, ~0.23 tại 5km. Chiếm weight 0.1 (steal từ semantic)
   - Excluded tags: trừ thẳng `0.15 * excluded_tag_score` (penalty)
   - Hard filters: `is_active`, `crowd_level != 'full'`, optional `max_group_size`, optional category, optional rating ≥ 4.0, optional minNameScore, optional **`city_id` / `district_id` FK equal**, optional **`ST_DWithin(location, user_point, max_distance_m)`**, optional `address_line` trigram ILIKE cho street
   - LEFT JOIN `cities` + `districts` để trả `city.name` + `district.name` cho FE display
7. **Relaxation fallback**: nếu < 5 kết quả và đang áp dụng filter cứng → re-run với filters relaxed
8. **Debug mode**: `?debug=1` → response kèm `score_breakdown { semantic, tag, name, category_match, rating, location, strategy }` cho mỗi venue. Response cũng có `distance_m` khi FE truyền GPS.

## Data flow phụ thuộc (cross-service)

- **Embedding sinh ở venue-service** (không phải search-ai-service). venue-service tự call HuggingFace mỗi lần create/update venue và ghi `embedding` vào DB. search-ai-service chỉ ĐỌC khi search.
- **Tags sinh ở review-processing module** (search-ai-service). Mỗi review mới qua RMQ → Groq phân tích → upsert `venue_tags`. Trigger DB tự cập nhật `tags.usage_count` → CategoryTagProvider lấy top-100 fresh ở cache miss kế tiếp (TTL 5 phút).
- **Categories master + venue_categories** thuộc venue-service domain. search-ai-service chỉ JOIN cross-schema để lấy `c.key` cho `matched_categories` field trên response.
- **Cities + districts master** thuộc venue-service domain. search-ai-service `LocationResolverService` đọc bảng để resolve text → uuid.

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3005
GROQ_API_KEY=gsk_...              # Groq AI cho review analysis + search query extraction. Nếu thiếu → search fallback về semantic-only
HUGGINGFACE_API_TOKEN=hf_...      # HuggingFace cho embeddings (optional, hoạt động không token với public models)
INTERACTION_SERVICE_URL=http://localhost:3004  # cho AI analysis callback
```

## Groq Usage (3 nơi)

| Use case | Model | Module | Trigger |
|---|---|---|---|
| Query extraction | `llama-3.1-8b-instant` | search/query-extraction.service.ts | Mỗi search request (cache miss) |
| Review analysis | `llama-3.3-70b-versatile` | review-processing/groq-ai.service.ts | Event RMQ `venue.reviewed` |
| Description tagging | `llama-3.1-8b-instant` | description-tagging/description-groq.service.ts | Event RMQ `venue.created` / `venue.updated` (description non-empty) |

## Conventions

- Mỗi feature mới tạo module riêng trong `modules/<feature>/`
- RMQ event handlers dùng manual ACK (`noAck: false`)
- Database transactions dùng `queryRunner` cho upsert operations
- AI service calls wrapped trong try/catch — không fail nếu AI không available
