# MyNook — Thuật toán Tìm kiếm & Gợi ý

> Tài liệu mô tả chi tiết quy trình end-to-end và công thức toán học đứng sau hệ thống tìm kiếm hybrid (AI-powered) và hệ thống gợi ý cá nhân hoá của đồ án **MyNook — Location Review & Discovery System**.
>
> Tất cả logic dưới đây được hiện thực trong microservice `search-ai-service` (port `3005`), cộng tác với `venue-service` (sinh embedding) và `interaction-service` (sinh review/favorite).

---

## 1. Tổng quan kiến trúc

```
┌────────────┐  q, lat, lng    ┌─────────────┐    HTTP     ┌──────────────────────┐
│ web-client │ ───────────────▶│ api-gateway │ ──────────▶ │ search-ai-service    │
│ (Next.js)  │                 │ (JWT verify)│             │  /search             │
└────────────┘                 └─────────────┘             │  /search/recommended │
                                                           └──────────────────────┘
                                                                     │
                                ┌────────────────────────────────────┼────────────────────────────────────┐
                                │                                    │                                    │
                          ┌─────▼─────┐                       ┌──────▼──────┐                      ┌──────▼──────┐
                          │  Groq AI  │                       │ HuggingFace │                      │ PostgreSQL  │
                          │ (Llama)   │                       │ MiniLM-L6   │                      │ + pgvector  │
                          │ extract   │                       │ embed (384) │                      │ + pg_trgm   │
                          │ intent    │                       │             │                      │ + PostGIS   │
                          └───────────┘                       └─────────────┘                      └─────────────┘
```

Hai luồng chính:

1. **Search** (`GET /search`): user gõ chuỗi tự do tiếng Việt → trả về list venues đã rank.
2. **Recommend** (`GET /search/recommended`): user đăng nhập → trả về list venues phù hợp khẩu vị (kNN trên taste vector).

Đồng thời, có 1 luồng nền giữ chất lượng dữ liệu:

3. **Review processing** (RMQ `venue.reviewed`): mỗi review mới → Groq phân tích → cập nhật bảng `venue_tags` (làm giàu chỉ mục cho search).

---

## 2. Mô hình dữ liệu cốt lõi

| Bảng | Cột quan trọng | Vai trò |
|---|---|---|
| `venue_schema.venues` | `id`, `name`, `branch_name`, `description`, `address_line`, `ward`, `city_id`, `district_id`, `latitude`, `longitude`, `location` (PostGIS `geography(Point, 4326)` GENERATED), `embedding` (`vector(384)`), `search_document`, `rating_avg`, `current_crowd_level`, `max_group_size`, `is_active` | Đối tượng search chính. Index HNSW trên `embedding`, GiST trên `location`, GIN/trgm trên `name`/`branch_name`/`address_line`. |
| `venue_schema.cities` / `districts` | `id`, `code`, `name`, `aliases text[]`, `centroid` (PostGIS) | Master taxonomy địa lý. `aliases` cho phép map "q1", "quan 1", "district 1" → cùng 1 record. |
| `venue_schema.categories` | `id`, `key`, `display_name`, `synonyms text[]` | Master loại quán (cafe, hotpot, bar...). `synonyms` đưa vào prompt Groq. |
| `venue_schema.venue_categories` | `(venue_id, category_id, is_primary)` | M:N venue ↔ category. |
| `search_schema.tags` | `id`, `key`, `display_name`, `category`, `usage_count` | Master tag (yên tĩnh, view đẹp, phù hợp nhóm...). `usage_count` được trigger DB tự bump → top-100 tag luôn fresh. |
| `search_schema.venue_tags` | `(venue_id, tag_id, time_frame, score, positive_count, negative_count)` | Tích luỹ điểm tag từ review. `time_frame` ∈ {morning, afternoon, evening, all_day}. |
| `interaction_schema.user_favorites` / `reviews` / `user_interactions` | `account_id`, `venue_id`, `rating`, `created_at`, `interaction_type` | Tín hiệu hành vi → seed cho recommend + recently viewed. |
| `search_schema.search_logs` | `account_id`, `search_query`, `filters_used` (JSONB) | Lưu lịch sử search để analytics + cải tiến prompt. |

Hai phần mở rộng quan trọng so với schema "phẳng" thông thường:

- **`embedding`**: vector 384 chiều của câu mô tả `name + branch + description + ward + district + city`, sinh tự động bằng `VenueEmbeddingService` ở venue-service mỗi khi create/update venue (fire-and-forget, không block CRUD).
- **`location` GENERATED**: cột geo được PostgreSQL tự suy ra từ `(longitude, latitude)`, tránh phải sync tay → `ST_DWithin` và `ST_Distance` luôn nhất quán với `lat/lng` của row.

---

## 3. Quy trình SEARCH (Hybrid AI Search)

Hàm chính: [`VenueSearchService.hybridSearch`](apps/search-ai-service/src/app/modules/search/venue-search.service.ts#L107-L217).

```
┌─────────────────────────────────────────────────────────────────────────┐
│ INPUT: { query, accountId?, lat?, lng?, maxDistanceM?, limit, offset }  │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ STEP 1. Regex pre-parse (zero-dep)       │   SearchParserService
│  · capacity: "5 người"  → 5              │
│  · time: "buổi tối"     → EVENING        │
│  · cleanQuery (strip ra ngoài)           │
└──────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 2. PARALLEL (Promise.all):                                        │
│  (a) Groq extract structured intent  ←  QueryExtractionService         │
│      → { intent, possible_name, categories[], tags[], excluded_tags[], │
│           location{city,district,street}, require_high_rating,         │
│           time_context, confidence }                                   │
│      → LRU 5000 / TTL 60' / single-flight (chống stampede)             │
│  (b) HuggingFace embed(cleanQuery) → vector(384)                       │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 3. PARALLEL ID resolution                                         │
│  · provider.resolveCategoryIds(keys) — drop key không tồn tại trong DB │
│  · provider.resolveTagIds(keys)                                        │
│  · provider.resolveTagIds(excluded_tags)                               │
│  · locationResolver.resolve({city,district})                           │
│      → city_id, district_id (alias exact + trigram fallback,           │
│        district scoped theo city để tránh "Q1 HN" lệch sang HCM)       │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 4. buildStrategy(intent, hasUserCoords) → weights + hard filters  │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 5. executeHybridQuery                                             │
│  Build SQL động → 1 round-trip Postgres                                │
│   semantic + tag + name + category + rating + distance − excluded      │
│   + WHERE hard filters                                                 │
│   + ORDER BY relevance_score DESC                                      │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼  results.length
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 6. Relaxation fallback                                            │
│  IF (#results < 5) AND (đang áp filter cứng)                           │
│    → re-run với applyCategoryHardFilter=false,                          │
│      applyRatingHardFilter=false, minNameScore=null,                   │
│      applyLocationHardFilter=false                                     │
│    (locationW vẫn giữ → vẫn ưu tiên gần user)                          │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 7. logSearch (best-effort) → search_schema.search_logs            │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼
        OUTPUT: SearchResult[]
```

### 3.1 Step 2a — Groq Query Extraction (intent classifier)

**Model**: `llama-3.1-8b-instant` (Groq), `temperature=0.2`, `response_format=json_object`, timeout 3.5s.

**Prompt building** (file: [`query-extraction.service.ts:118-181`](apps/search-ai-service/src/app/modules/search/query-extraction.service.ts#L118-L181)):

- System prompt mô tả task tiếng Việt + JSON schema bắt buộc.
- Inject động:
  - Danh sách **active categories** (từ `CategoryTagProviderService`, cache 5'): `key + display_name + synonyms[]`.
  - Danh sách **top-100 tags** sort theo `usage_count` DESC.
- Quy tắc: chỉ được trả `key` tồn tại trong 2 danh sách, không bịa.

**Output** (sau `sanitize`):

```ts
{
  intent: 'name' | 'attribute' | 'mixed' | 'unclear',
  possible_name: string | null,    // ví dụ "hữu duyên"
  categories: string[],            // ['hotpot', 'cafe']
  tags: string[],                  // ['yen-tinh', 'view-dep']
  excluded_tags: string[],         // ['noisy']  → bị trừ điểm
  location: { city, district, street },
  require_high_rating: boolean,
  time_context: 'morning' | 'afternoon' | 'evening' | 'all_day' | null,
  confidence: 'high' | 'medium' | 'low'
}
```

**Sanitize quan trọng** (line 183-247):
- Loại key không có trong DB (ngừa Groq bịa).
- Dedup `tags ∪ excluded_tags`: nếu trùng, giữ ở `tags`, bỏ ở `excluded_tags` (tránh vừa cộng vừa trừ → lệch ranking).
- Validate enum `intent`/`confidence`/`time_context`.

**Graceful degradation**: Nếu `GROQ_API_KEY` thiếu, hoặc Groq fail/timeout → trả `FALLBACK_EXTRACTION` (`intent='unclear'`, mảng rỗng) → search **vẫn chạy** bằng semantic-only.

### 3.2 Step 2b — Embedding (HuggingFace)

- Model: `sentence-transformers/all-MiniLM-L6-v2`, dimension = 384.
- Service: [`EmbeddingService.embed`](apps/search-ai-service/src/app/modules/search/embedding.service.ts#L29-L50).
- Wrap try/catch — nếu HF down, search vẫn chạy với `queryVector = null` (trọng số semantic ăn 0, name/tag/rating gánh).
- Format đầu ra cho pgvector: `[v1,v2,...,v384]` (string).

### 3.3 Step 4 — Strategy Selection

[`buildStrategy(extraction, hasUserCoords)`](apps/search-ai-service/src/app/modules/search/venue-search.service.ts#L221-L289).

Khi `hasUserCoords = true`, hệ thống "đánh thuế" 0.1 từ trọng số semantic để dành cho location. Bảng strategy chính (locationW = 0 nếu không có GPS):

| Intent | nameW | semW | tagW | catBoost | ratingW | locationW | hardCat | hardRating | minNameScore |
|---|---|---|---|---|---|---|---|---|---|
| **name** | 0.70 | 0.10 | 0.10 | 0 | 0.10 − loc | loc | ❌ | nếu `require` | **0.30** |
| **attribute** | 0 | 0.40 − loc | 0.40 | 0.10 | 0.10 | loc | ✅ nếu `conf=high` & có cat | nếu `require` | null |
| **mixed** | 0.40 | 0.20 − loc | 0.20 | 0.10 | 0.10 | loc | ❌ | nếu `require` | null |
| **unclear** | 0.20 | 0.50 − loc | 0.20 | 0 | 0.10 | loc | ❌ | ❌ | null |

Ý nghĩa:

- **name** (user gõ tên cụ thể): tin pg_trgm trên `name`/`branch_name` nhất, ép `name_score ≥ 0.30` để loại noise.
- **attribute** (mô tả tính chất): semantic + tag chiếm ngang nhau. Nếu Groq tự tin (`confidence=high`) và có category → áp **hard filter category**.
- **mixed** (vừa tên vừa tính chất): chia đều, không hard filter.
- **unclear**: nghiêng hẳn về semantic vì không có tín hiệu khác đáng tin.

### 3.4 Step 5 — Hybrid SQL (1 round-trip duy nhất)

Toàn bộ tính điểm + sort + paginate trong **1 query động** dựng tại [`executeHybridQuery`](apps/search-ai-service/src/app/modules/search/venue-search.service.ts#L303-L613). Điểm relevance:

```
relevance_score(v) =
      semW       · semantic(v)
    + tagW       · norm_tag(v)
    + nameW      · name_score(v)
    + catBoost   · category_match(v)
    + ratingW    · rating_norm(v)
    + locationW  · distance_score(v)
    − 0.15       · norm_excluded(v)
```

Chi tiết từng hạng tử:

#### a) Semantic — pgvector cosine
```sql
semantic(v) = CASE WHEN v.embedding IS NULL THEN 0
                   ELSE (1 − LEAST(v.embedding <=> $vec, 1.0))
              END
```
- `<=>` là cosine **distance** (∈ [0,2]). Lấy `1 − LEAST(d, 1.0)` ⇒ trả về **similarity** ∈ [0,1].
- NULL-safe: venue chưa có embedding (mới tạo, HF chưa kịp gọi) → 0, không loại khỏi kết quả.

#### b) Matched-tag SUM (lọc theo time-frame)
```sql
norm_tag(v) = LEAST( SUM(vt.score) / 3.0,  1.0 )
   với vt: vt.tag_id IN ($matchedTagIds) AND vt.score > 0
       AND (time_frame = $time OR time_frame = 'all_day')   -- chỉ khi có timeContext
```
- Chỉ cộng điểm các tag user đề cập (mảng từ Groq), tránh penalty cho venue có tag âm khác.
- Chia 3 và cap 1.0: chuẩn hoá về thang [0,1] (`SUM` có thể rất to nếu venue được review nhiều).
- Nếu user nói "buổi tối" → chỉ tính `venue_tags` với `time_frame=evening` hoặc `all_day` → một quán "yên tĩnh ban ngày, ồn ban đêm" sẽ không match query "yên tĩnh buổi tối".

#### c) Name fuzzy — pg_trgm + f_unaccent
```sql
name_score(v) = GREATEST(
    similarity(public.f_unaccent(lower(v.name)),         public.f_unaccent(lower($name))),
    similarity(public.f_unaccent(lower(coalesce(v.branch_name,''))), public.f_unaccent(lower($name)))
)
```
- `public.f_unaccent` là **wrapper IMMUTABLE** của `unaccent()` (migration cũ) — bắt buộc dùng wrapper để planner pick được index trigram. Dùng trực tiếp `unaccent()` ⇒ index lose.
- Dùng `GREATEST(name, branch)` để chấp nhận cả "Highlands" (chain) lẫn "Highlands Bitexco" (chi nhánh).

#### d) Category boost
```sql
category_match(v) = CASE WHEN EXISTS (
   SELECT 1 FROM venue_schema.venue_categories vc
   WHERE vc.venue_id = v.id AND vc.category_id = ANY($matchedCategoryIds)
) THEN 1 ELSE 0 END
```
Boost 0/1 nhẹ, áp dụng khi Groq nhận ra "cafe", "hotpot",... Trong intent `attribute` + `confidence=high` còn thêm hard filter ở `WHERE`.

#### e) Rating
```sql
rating_norm(v) = v.rating_avg / 5.0    ∈ [0, 1]
```

#### f) Distance — PostGIS (chỉ khi FE truyền GPS)
```sql
d = ST_Distance(v.location, ST_SetSRID(ST_MakePoint($lng,$lat),4326)::geography)   -- mét

distance_score(v) = CASE WHEN v.location IS NULL THEN 0
                         ELSE 1.0 / (1.0 + d / 1500.0)
                    END
```
- Hàm decay nghịch đảo: `score(0) = 1.0`, `score(1500m) ≈ 0.5`, `score(5km) ≈ 0.23`.
- Ngoài ranking, `d` được trả về thô qua field `distance_m` để FE hiển thị "cách 320m".

#### g) Excluded penalty
```sql
norm_excluded(v) = LEAST( SUM(vt.score) / 3.0, 1.0 )    -- với tag_id ∈ excluded_tags
```
Trừ thẳng `0.15 · norm_excluded` — đủ mạnh để đẩy "quán ồn" ra khỏi top khi user yêu cầu "không ồn", nhưng không loại hẳn (vẫn lọt nếu các yếu tố khác cao).

#### h) Hard filters (WHERE)

```sql
v.is_active = true
AND v.current_crowd_level != 'full'
AND v.max_group_size >= $minCapacity                  -- nếu có
AND v.city_id     = $cityId                           -- nếu strategy.applyLocationHardFilter
AND v.district_id = $districtId                       -- nếu strategy.applyLocationHardFilter
AND EXISTS(...venue_categories...)                    -- nếu hardCat
AND v.rating_avg >= 4.0                               -- nếu hardRating
AND name_score >= 0.30                                -- nếu intent=name (minNameScore)
AND public.f_unaccent(lower(v.address_line)) ILIKE '%'||$street||'%'  -- nếu Groq nêu street
AND ST_DWithin(v.location, $userPoint, $maxDistanceM) -- nếu FE truyền maxDistanceM
```

### 3.5 Step 6 — Relaxation Fallback

Lý do: filter cứng quá nghiêm (đặc biệt geo + rating ≥ 4) hay khiến vùng ven hoặc city mới (Đà Nẵng, ít venue) trả về 0 kết quả.

Cơ chế:
```
IF results.length < 5
   AND (hardCat ∨ hardRating ∨ minNameScore ∨ hasGeoFilter)
THEN
   re-run với applyCategoryHardFilter=false,
              applyRatingHardFilter=false,
              minNameScore=null,
              applyLocationHardFilter=false
```

`locationW` (boost mềm) **vẫn giữ** trong relaxation → user vẫn thấy quán gần mình hơn ở top, chỉ là không bị giới hạn cứng trong city/district nữa.

### 3.6 Debug mode

`?debug=1` ⇒ response bổ sung `score_breakdown` mỗi venue:

```json
{
  "score_breakdown": {
    "semantic": 0.83,
    "tag": 0.42,
    "name": 0.0,
    "category_match": 1.0,
    "rating": 0.92,
    "location": 0.71,
    "strategy": "attribute"
  }
}
```

Cực hữu ích khi tinh chỉnh weights hoặc giải thích vì sao 1 venue rank cao/thấp.

---

## 4. Quy trình RECOMMEND (Personalized kNN)

Hàm chính: [`RecommendService.recommendForUser`](apps/search-ai-service/src/app/modules/search/recommend.service.ts#L50-L178).

### 4.1 Định nghĩa "taste vector"

> Taste vector của user = **trung bình embedding** các venue mà user đã thể hiện tín hiệu tích cực.

Tín hiệu tích cực = **favorite** ∪ **review với rating ≥ 4**.

### 4.2 Quy trình

```
1. Seed query (50 row gần nhất, sort created_at DESC):
     SELECT venue_id FROM (
       SELECT venue_id, created_at FROM user_favorites WHERE account_id=$1
       UNION ALL
       SELECT venue_id, created_at FROM reviews WHERE account_id=$1 AND rating>=4
     ) JOIN venues v ON v.id = venue_id WHERE v.is_active = true
     ORDER BY created_at DESC LIMIT 50

   → Nếu seedRows rỗng ⇒ trả [] (FE biết ẩn section, fallback list chung).

2. Exclude set (tránh recommend lại venue user đã chạm):
     UNION { user_favorites } ∪ { reviews } của user → exclude_ids[]

3. kNN qua pgvector trong 1 SQL pass:
     WITH taste AS (
       SELECT AVG(embedding)::vector AS vec
       FROM venues
       WHERE id = ANY(seed_ids) AND embedding IS NOT NULL
     )
     SELECT v.*, 1 - LEAST(v.embedding <=> taste.vec, 1.0) AS similarity
     FROM venues v CROSS JOIN taste
     LEFT JOIN cities c ...  LEFT JOIN districts d ...
     LEFT JOIN LATERAL (...primary category...) pc ON true
     WHERE v.is_active = true
       AND v.embedding IS NOT NULL
       AND taste.vec IS NOT NULL
       AND v.id <> ALL(exclude_ids)
       AND v.current_crowd_level != 'full'
     ORDER BY v.embedding <=> taste.vec ASC,    -- cosine distance, nhỏ trước
              v.rating_avg DESC                 -- tie-break: rating cao thắng
     LIMIT $3
```

### 4.3 Vì sao là centroid (mean) của embedding?

Vì 384 chiều "có ý nghĩa" theo nghĩa ngôn ngữ học (MiniLM-L6 huấn luyện sentence-transformers), **trung bình** vẫn nằm trong không gian semantic hợp lệ và biểu diễn được "khẩu vị tổng hợp" của user.

Lựa chọn này:

- **Đơn giản, 1 query duy nhất** — không cần stored taste vector hay job nightly.
- **Reactivity tức thì** — user vừa thả tim 1 quán → recommend đổi ngay ở request kế.
- **Cold start tự xử lý** — user chưa có signal ⇒ `seedRows = []` ⇒ trả `[]` → FE ẩn section thay vì show spam.

Nhược điểm chấp nhận được ở quy mô đồ án: nếu user thích cả "cafe yên tĩnh" lẫn "bar sôi động" thì centroid rơi vào vùng "trung tính" → kNN có thể trả về một mớ tạp. Có thể nâng cấp về sau bằng cluster-then-query (tách mean theo cluster).

### 4.4 Khác biệt với SEARCH

| Khía cạnh | Search | Recommend |
|---|---|---|
| Input | Free-text query | accountId |
| Vector nguồn | embed(query) | AVG(embedding) của seed venues |
| Score | Tổ hợp 7 hạng tử | Cosine similarity thuần (+ rating tie-break) |
| Filters | Hard filters cứng từ Groq | Chỉ exclude venues đã interact |
| Cold start | Luôn có kết quả (semantic) | Trả [] nếu chưa có signal |

---

## 5. Quy trình REVIEW PROCESSING (giàu chỉ mục cho Search)

Hàm: [`ReviewProcessingService.processReview`](apps/search-ai-service/src/app/modules/review-processing/review-processing.service.ts#L44-L142).

```
interaction-service (user post review)
        │
        │  RMQ event 'venue.reviewed'
        ▼
search-ai-service (consumer, manual ACK)
        │
        ├─ 1. Lấy danh sách tag hiện có (cho prompt)
        │
        ├─ 2. Groq llama-3.3-70b-versatile phân tích review
        │      → { positive_tags[], negative_tags[], new_tags[], time_context, sentiment }
        │
        ├─ 3. BEGIN TRANSACTION
        │   3a. Tạo các tag mới (nếu Groq đề xuất key chưa tồn tại)
        │   3b. UPSERT venue_tags cho positive_tags:
        │         score          += +multiplier
        │         positive_count += 1
        │         (multiplier = 2 nếu isVerifiedVisit, ngược lại = 1)
        │   3c. UPSERT venue_tags cho negative_tags:
        │         score          += −multiplier
        │         negative_count += 1
        │      (key = (venue_id, tag_id, time_frame))
        │   COMMIT
        │
        └─ 4. Callback HTTP PATCH /reviews/:id/ai-analysis (interaction-service)
              để lưu snapshot JSON cho review (phục vụ revert nếu xoá review)
```

### 5.1 Cập nhật `tags.usage_count` (trigger DB)

Migration `010_*.sql` cài trigger `trg_venue_tags_bump_usage` trên `venue_tags`:

- INSERT row mới ⇒ `tags.usage_count += 1`
- UPDATE thay `tag_id` ⇒ giảm tag cũ, tăng tag mới
- DELETE ⇒ giảm `usage_count`

⇒ Top-100 tags trong `CategoryTagProviderService` (TTL 5') luôn fresh, **không cần cron**, không cần worker. Đây là chìa khoá để prompt Groq luôn trỏ về tag thật-sự được cộng đồng dùng nhiều.

### 5.2 Revert review

Khi review bị xoá (admin hoặc user), interaction-service emit `venue.review-deleted` kèm snapshot AI analysis. `revertReview` áp delta ngược:

- score: cộng/trừ lại đúng `multiplier` ban đầu.
- positive/negative counts: `GREATEST(count − 1, 0)` (không âm).
- Sau revert, DELETE row có `score=0 AND positive_count=0 AND negative_count=0` → trigger giảm `usage_count` đúng.

---

## 6. Resolve location (Groq text → DB id)

Hàm: [`LocationResolverService.resolve`](apps/search-ai-service/src/app/modules/search/location-resolver.service.ts#L38-L47). Cache trong process 10'.

Pipeline cho mỗi text:

1. Normalize: `lowercase + NFC + collapse whitespace`.
2. Query duy nhất với 4 mệnh đề OR + ORDER BY ưu tiên:
   ```sql
   SELECT id FROM cities WHERE is_active=true AND (
        lower(name) = $1                                     -- exact name (priority 0)
     OR $1 = ANY(aliases)                                    -- alias hit  (priority 1)
     OR lower(code) = $1                                     -- mã code    (priority 2)
     OR similarity(f_unaccent(lower(name)), f_unaccent($1)) > 0.55   -- typo  (priority 3)
   ) ORDER BY priority LIMIT 1
   ```
3. District resolve **được scope theo `city_id`** (nếu đã resolve được city) ⇒ "Quận 1" trong câu "ăn lẩu HN Quận 1" sẽ không match Quận 1 HCM nhầm.

So với cách cũ (ILIKE `%q1%` trên `venues.district`):
- Chính xác hơn: alias là tập đóng do admin curate.
- Index FK `city_id`/`district_id` đẩy WHERE thành equality (sargable, dùng B-tree index) thay vì wildcard ILIKE.

---

## 7. Cache & chống stampede

| Cache | Phạm vi | TTL | Key | Mục đích |
|---|---|---|---|---|
| `QueryCacheService` | Per-process LRU 5000 | 60' | normalized query | Tránh gọi Groq lặp khi user retry. **Single-flight**: nhiều request đồng thời cùng query → share 1 Promise. |
| `CategoryTagProviderService` | Per-process | 5' | global | Categories + top-100 tags cho prompt. |
| `LocationResolverService` | Per-process | 10' | normalized text + scoping city_id | Map "Q1" → uuid. |

Tại sao cache trong process (không Redis)?

- Hệ thống chỉ chạy 1 instance search-ai-service ở môi trường đồ án.
- Latency 0ms vs Redis ~1ms.
- Mất cache khi restart không nguy hiểm (chỉ là 1 lần Groq call).

Khi scale ngang (nhiều instance), nâng cấp lên Redis là 1 step thẳng băng.

---

## 8. Đặc điểm bền vững (resilience)

| Tình huống | Hành vi |
|---|---|
| `GROQ_API_KEY` thiếu | `extract()` trả `FALLBACK_EXTRACTION` ⇒ search chạy bằng semantic-only. |
| Groq timeout (>3.5s) | Tương tự — fallback. |
| HuggingFace fail | `safeEmbed` log warn, `queryVector = null` ⇒ semantic = 0, các hạng tử khác gánh. Pure-text ILIKE fallback (Step 5) bật khi vừa không có vector vừa không có name. |
| Venue thiếu embedding | `CASE WHEN v.embedding IS NULL THEN 0` ⇒ vẫn lọt vào kết quả nếu các score khác đủ cao. Có nút admin reindex (`POST /api/admin/venues/reindex-embeddings`). |
| Filter cứng quá khắt | Relaxation pass (Step 6) bỏ hard filters khi <5 kết quả. |
| User chưa có signal | Recommend trả `[]` thay vì lỗi → FE fallback list. |
| Groq trả key bịa | `sanitize` lọc bằng `Set(category.key)` / `Set(tag.key)` ⇒ drop. |
| Trùng key tags ↔ excluded_tags | Dedup nghiêng về `tags` (positive thắng) để tránh vừa cộng vừa trừ. |

---

## 9. Sơ đồ ví dụ end-to-end

User gõ: **"quán cà phê yên tĩnh quận 1 cho 4 người buổi tối"**, gửi kèm `lat=10.776, lng=106.700`.

| Bước | Output |
|---|---|
| 1. Regex parse | `cleanQuery="quán cà phê yên tĩnh quận 1"`, `capacity=4`, `time=EVENING` |
| 2a. Groq | `intent='attribute', possible_name=null, categories=['cafe'], tags=['yen-tinh'], excluded_tags=[], location={city:null,district:'Quận 1',street:null}, require_high_rating=false, time_context='evening', confidence='high'` |
| 2b. Embed | `vector(384)` cho "quán cà phê yên tĩnh quận 1" |
| 3. Resolve | `cafe_id='uuid-cafe', tag_id_yentinh='uuid-yt', district_id='uuid-q1-hcm'` (alias hit "quận 1") |
| 4. Strategy | `attribute` → `nameW=0, semW=0.3, tagW=0.4, catBoost=0.1, ratingW=0.1, locationW=0.1`, hardCat=true (có cat & conf=high) |
| 5. SQL WHERE | `is_active AND crowd≠full AND max_group_size≥4 AND district_id=q1 AND EXISTS(venue_categories=cafe)` |
| 5. SQL score | `0.3·semantic + 0.4·tag(yen-tinh, time=evening∨all_day) + 0.1·cat + 0.1·(rating/5) + 0.1·distance_score` |
| 6. Fallback | Bỏ qua nếu ≥5 kết quả |
| 7. Log | INSERT vào `search_logs` với `account_id, query, filters_used` |

---

## 10. Tóm tắt đóng góp về mặt thuật toán

1. **Hybrid scoring nhiều tín hiệu** thay cho pure-keyword hoặc pure-vector: cân bằng giữa pgvector (semantic), pg_trgm (lexical), tag (review-derived), category (taxonomy), PostGIS (geo) và rating (social).
2. **Strategy theo intent** (`name | attribute | mixed | unclear`): không có "one weight fits all" — search "Highlands Bitexco" và "quán yên tĩnh" cần đường rank khác nhau.
3. **AI extraction layer** (Groq) làm cầu nối giữa câu hỏi tự nhiên và schema cấu trúc, nhưng **không signal-of-truth** — output luôn được sanitize và filter cứng theo whitelist DB.
4. **Tự sửa**: relaxation fallback + NULL-safe embedding + graceful degradation đảm bảo user gần như không bao giờ thấy "0 kết quả" trừ khi DB thật sự rỗng.
5. **Personalized kNN qua taste centroid** + auto-exclude venues đã interact: recommend tức thì sau mỗi favorite/review, không cần job batch.
6. **Tag economy** auto-fresh qua DB trigger ⇒ prompt Groq luôn trỏ về tag thực sự được dùng nhiều, không drift.

---

## 11. Tham chiếu file nguồn

| Chức năng | File |
|---|---|
| Search orchestration | [`venue-search.service.ts`](apps/search-ai-service/src/app/modules/search/venue-search.service.ts) |
| Regex parse | [`search-parser.service.ts`](apps/search-ai-service/src/app/modules/search/search-parser.service.ts) |
| Groq extraction | [`query-extraction.service.ts`](apps/search-ai-service/src/app/modules/search/query-extraction.service.ts) |
| LRU + single-flight | [`query-cache.service.ts`](apps/search-ai-service/src/app/modules/search/query-cache.service.ts) |
| Categories + tags cache | [`category-tag-provider.service.ts`](apps/search-ai-service/src/app/modules/search/category-tag-provider.service.ts) |
| Location resolver | [`location-resolver.service.ts`](apps/search-ai-service/src/app/modules/search/location-resolver.service.ts) |
| HuggingFace embed | [`embedding.service.ts`](apps/search-ai-service/src/app/modules/search/embedding.service.ts) |
| Recommendation kNN | [`recommend.service.ts`](apps/search-ai-service/src/app/modules/search/recommend.service.ts) |
| Review → tags | [`review-processing.service.ts`](apps/search-ai-service/src/app/modules/review-processing/review-processing.service.ts) |
| Groq review analyzer | [`groq-ai.service.ts`](apps/search-ai-service/src/app/modules/review-processing/groq-ai.service.ts) |
| DB migrations (trigram, embedding, trigger usage_count) | [`libs/database/src/lib/migrations/`](libs/database/src/lib/migrations/) |
