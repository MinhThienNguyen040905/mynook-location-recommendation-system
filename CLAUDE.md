# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **web-client** (port 3000): Next.js 16 App Router frontend.
- **api-gateway** (port 3001): the ONLY public HTTP entry point, prefixed `/api`. Forwards requests to microservices via HTTP (`@nestjs/axios`).
- **4 microservices** (auth:3002, venue:3003, interaction:3004, search-ai:3005): NestJS HTTP apps, internal only (not exposed publicly in production).
- Inter-service async events use RabbitMQ via `@mynook/rmq-messaging` (production).
- **AI-powered Hybrid Search**: search-ai-service calls Groq per query to extract `{ intent, possible_name, categories, tags, excluded_tags, location, require_high_rating, time_context }`. Ranking combines pgvector cosine + matched-tag SUM + pg_trgm fuzzy name match + category boost + rating. LRU cache + single-flight protect against stampede.
- **Venue Categories (M:N)**: `venue_schema.categories` is a master list (cafe, restaurant, hotpot, …) with synonyms. `venue_schema.venue_categories` joins it to venues. Categories are human-curated (owner/admin) and used by the AI search as hard filter (when Groq confidence=high) or boost. CRUD lives in venue-service; search-ai-service reads via cross-schema join.
- **Location taxonomy (cities/districts + PostGIS)**: `venue_schema.cities` + `venue_schema.districts` are master tables with `aliases[]` (e.g. `["q1","quan 1","district 1"]`) and PostGIS `centroid` points. Venues now reference them via `city_id` + `district_id` FKs (instead of the old free-text `city`/`district`). `venues.location` is a generated `geography(Point, 4326)` from `(longitude, latitude)` enabling distance ranking + `ST_DWithin` "nearby" filter. search-ai-service has a `LocationResolverService` that maps Groq-extracted text ("Q1") → district_id via aliases/trigram, enabling exact FK filtering instead of ILIKE.
- **Auto Embedding Generation**: venue-service `VenueEmbeddingService` builds `search_document` from `name + branch + description + ward + district.name + city.name` and calls HuggingFace (`all-MiniLM-L6-v2`, 384-dim) on every venue create/update — fire-and-forget so HF latency never blocks the CRUD response. Admin can bulk-fix via `POST /api/admin/venues/reindex-embeddings?force=1`.
- **Tag usage_count auto-fresh**: DB trigger `trg_venue_tags_bump_usage` (migration 010) increments/decrements `search_schema.tags.usage_count` on every `venue_tags` insert/update/delete. Keeps `CategoryTagProvider`'s top-100 popular-tags list correct over time without crons.
- **AI Review Processing**: interaction-service emits `venue.reviewed` → search-ai-service analyzes via Groq AI (Llama 3.3) → upserts VenueTag scores → callbacks AI analysis JSON.
- **AI Description Seed Tagging**: venue-service emits `venue.created` / `venue.updated` (only when `description` is non-empty) → search-ai-service `DescriptionTaggingService` calls Groq Llama 3.1, extracts applicable tag keys from the candidate top-100 list, and seeds `venue_tags` rows with `time_frame=all_day`, `score=0.5`, `positive_count=0`. Idempotent via `ON CONFLICT ... DO UPDATE SET score = GREATEST(existing, floor)` — re-runs never compound, never lower scores reviews already pushed above the floor. Lets brand-new venues escape the "zero matched-tag" cliff before any reviews exist; verified-visit reviews (×2 multiplier) easily dominate seed scores over time.
- **Community Venue Contribution**: Any logged-in user (customer or owner) can contribute venues via `POST /venues/community`. Community venues (`is_community_contributed = true`) have no owner and can be edited by anyone.
- **Admin Console**: Mọi endpoint admin đặt dưới `/api/admin/*` ở api-gateway, bảo vệ bằng `JwtAuthGuard + AdminGuard` (yêu cầu `account.type = admin`). Admin quản lý accounts (khóa/mở), venues (CRUD + khôi phục + hard delete), reviews + reports (duyệt, xóa), broadcast notifications cho toàn user/owner/customer, và xem dashboard tổng hợp (`GET /api/admin/dashboard`) từ cả 3 microservices.

## Commands

```bash
# Serve all apps
npx nx run-many -t serve

# Serve single app
npx nx serve api-gateway
npx nx dev web-client

# Build
npx nx run-many -t build
npx nx build <app-name>

# Typecheck
npx nx run-many -t typecheck

# Dependency graph
npx nx graph

# List all projects
npx nx show projects
```

## Package Installation

All packages install at the **root** — never `cd` into an app directory.

```bash
npm install <package>        # runtime dependency
npm install -D <package>     # dev dependency
npx shadcn@latest add <component> --cwd apps/web-client  # shadcn UI
```

## Shared Libraries

| Library | Import path | Purpose |
|---------|------------|---------|
| shared-types | `@mynook/shared-types` | Enums (AccountType, VenueCategory, BookingStatus), interfaces (IAccount, IVenue, IReview), service URL constants, RMQ_EVENTS, RMQ_QUEUES |
| database | `@mynook/database` | DB connection config, entity schemas |
| rmq-messaging | `@mynook/rmq-messaging` | `RmqModule.register()` for RabbitMQ client/server setup |
| cloudinary | `@mynook/cloudinary` | `CloudinaryModule` + `CloudinaryService` for image/video upload to Cloudinary |

## Folder Structure Convention

Mỗi NestJS app (service) tuân theo cấu trúc **modular** chuẩn:

```
apps/<service-name>/src/
  main.ts
  app/
    app.module.ts                  # Root module — chỉ import sub-modules
    common/                        # (api-gateway only) Guards, interceptors, strategies
      guards/
      interceptors/
      strategies/
    modules/
      <feature>/
        <feature>.module.ts        # NestJS @Module() cho feature
        <feature>.controller.ts
        <feature>.service.ts
        dto/
          <dto-files>.ts
```

### Quy tắc:
- **KHÔNG** đặt controller/service trực tiếp trong `src/app/`. Mỗi feature PHẢI nằm trong `modules/<feature>/`.
- Mỗi feature module có file `<feature>.module.ts` riêng, được import vào `app.module.ts`.
- DTOs nằm trong `modules/<feature>/dto/`.
- Trong **api-gateway**, các module được nhóm theo downstream service mà chúng forward đến:
  - `modules/auth/` → forward đến auth-service
  - `modules/venue/` → forward đến venue-service (venue, menu, upload controllers)
  - `modules/interaction/` → forward đến interaction-service (notification, review, report controllers)
  - `modules/admin/` → các controller cần `AdminGuard`, fan-out đến nhiều downstream services
- Shared utilities (guards, interceptors, strategies) nằm trong `common/` (chỉ api-gateway).

## Key Conventions

- API Gateway communicates with microservices via HTTP REST using `@nestjs/axios` (HttpService).
- Service URL constants are defined in `@mynook/shared-types` (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.), configurable via environment variables.
- Each microservice is a standard NestJS HTTP app with its own port.
- TypeScript strict mode is enabled. Module resolution is `nodenext`.
- Nx workspace uses `@nx/js/typescript`, `@nx/next/plugin`, and `@nx/webpack/plugin` inferred targets.

## Port Assignments

| Service | Port | Transport |
|---------|------|-----------|
| web-client | 3000 | HTTP |
| api-gateway | 3001 | HTTP REST |
| auth-service | 3002 | HTTP |
| venue-service | 3003 | HTTP |
| interaction-service | 3004 | HTTP |
| search-ai-service | 3005 | HTTP |

## Quy chuẩn Xác thực & Giao tiếp (Authentication & Communication Guidelines)

Hệ thống áp dụng mô hình **API Gateway Authentication Offloading**. Mọi logic xác thực JWT được xử lý tập trung tại API Gateway — các downstream service KHÔNG tự giải mã token.

### Rule 1: Gateway là nơi DUY NHẤT xác thực JWT

- `JwtStrategy` và `JwtAuthGuard` chỉ tồn tại tại `apps/api-gateway/src/app/common/strategies/` và `apps/api-gateway/src/app/common/guards/`.
- API Gateway là nơi duy nhất giữ và sử dụng `JWT_SECRET` để verify token.
- Các downstream services (venue-service, interaction-service, search-ai-service) **TUYỆT ĐỐI KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`.
- auth-service giữ `JwtModule` chỉ để **sign** token (login/register), KHÔNG dùng để verify request.

### Rule 2: Gateway forward thông tin user qua custom headers

- Sau khi verify JWT thành công, Gateway map payload thành headers:
  - `x-user-id` ← `payload.sub` (UUID của account)
  - `x-user-type` ← `payload.type` (AccountType enum)
- Sử dụng `AuthHeadersInterceptor` + helper `buildUserHeaders()` từ `apps/api-gateway/src/app/common/interceptors/auth-headers.interceptor.ts`.
- **KHÔNG forward nguyên JWT token** (`Authorization` header) xuống downstream services.
- Pattern sử dụng trong Gateway controller:
  ```typescript
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuthHeadersInterceptor)
  @Get('some-endpoint')
  async handler(@Request() req: { authHeaders: Record<string, string> }) {
    const { data } = await firstValueFrom(
      this.http.get(`${SERVICE_URL}/endpoint`, { headers: req.authHeaders }),
    );
    return data;
  }
  ```

### Rule 3: Downstream services dùng @CurrentUser() để lấy thông tin account

- Khi tạo bất kỳ API Controller nào ở service con cần thông tin account, **PHẢI** dùng decorator `@CurrentUser()` (import từ `@mynook/shared-types`).
- Decorator đọc giá trị từ `x-user-id` và `x-user-type` headers và trả về `CurrentUserPayload { id, type }`.
- **KHÔNG** dùng `@UseGuards(AuthGuard('jwt'))` ở service con.
- **KHÔNG** import bất kỳ package JWT/Passport nào vào service con (trừ auth-service cần JwtModule để sign token).
- Pattern sử dụng trong downstream controller:
  ```typescript
  import { CurrentUser, CurrentUserPayload } from '@mynook/shared-types';

  @Get('my-resource')
  getMyResource(@CurrentUser() user: CurrentUserPayload) {
    // user.id   — authenticated account's UUID
    // user.type — authenticated account's type (AccountType enum)
    return this.service.findByAccountId(user.id);
  }
  ```

## Data Model & Identity

Hệ thống dùng Entity **Account** với **AccountType** là `customer` hoặc `owner`. Từ khóa `owner` được dùng thay cho `business` để đồng bộ với Frontend. Một `owner` account có thể quản lý nhiều venues (chi nhánh) thông qua cột `owner_id`.

- Một `owner` account quản lý nhiều venues (thông qua cột `owner_id` trong bảng `venues`).
- **Community venues**: `is_community_contributed = true`, `owner_id = null`, `contributed_by` = UUID người đóng góp. Bất kỳ user đăng nhập nào cũng có thể edit.
- Mọi dữ liệu tương tác (review, log, favorite, notification) đều liên kết qua cột `account_id`.
- Bảng: `auth_schema.accounts` (thay thế `auth_schema.users`).
- JWT payload chứa `type` (AccountType) thay vì `role`.
- Header forwarding: `x-user-type` (thay vì `x-user-role`).
- `CurrentUserPayload` có trường `type` (thay vì `role`).

## Admin Endpoints (route: `/api/admin/*`)

Tất cả cần `JwtAuthGuard + AdminGuard` (`type = admin`).

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/admin/dashboard` | Overview tổng hợp: accounts, venues, interaction, reports |
| GET    | `/api/admin/accounts` | List accounts (filter: type, is_active, q, page, limit) |
| GET    | `/api/admin/accounts/stats` | Thống kê accounts |
| GET    | `/api/admin/accounts/:id` | Chi tiết account |
| PATCH  | `/api/admin/accounts/:id/status` | Khóa / mở tài khoản (`{ is_active }`) |
| GET    | `/api/admin/venues` | List tất cả venues (gồm inactive) |
| GET    | `/api/admin/venues/stats` | Stats venues (tổng, hot, popular areas) |
| GET    | `/api/admin/venues/cities` | Phân bố theo city |
| POST   | `/api/admin/venues` | Admin tạo venue |
| PATCH  | `/api/admin/venues/:id` | Admin cập nhật bất kỳ venue nào |
| PATCH  | `/api/admin/venues/:id/restore` | Khôi phục venue đã soft-delete |
| DELETE | `/api/admin/venues/:id` | Soft-delete venue |
| DELETE | `/api/admin/venues/:id/hard` | Xóa vĩnh viễn venue |
| GET    | `/api/admin/reviews` | List reviews (filter: venue_id, account_id) |
| DELETE | `/api/admin/reviews/:id` | Xóa review |
| GET    | `/api/admin/reports` | List review reports |
| GET    | `/api/admin/reports/stats` | Stats reports |
| GET    | `/api/admin/reports/:id` | Chi tiết report (kèm review gốc) |
| PATCH  | `/api/admin/reports/:id/resolve` | Xử lý report (`action: delete \| dismiss`) |
| GET    | `/api/admin/venue-reports` | List venue reports |
| GET    | `/api/admin/venue-reports/stats` | Stats venue reports |
| GET    | `/api/admin/venue-reports/:id` | Chi tiết venue report |
| PATCH  | `/api/admin/venue-reports/:id/resolve` | Xử lý (`action: deactivate \| dismiss`) — deactivate sẽ soft-delete venue + bulk-resolve tất cả report của venue đó |
| POST   | `/api/admin/notifications/broadcast` | Gửi thông báo tổng (`target: all \| customer \| owner` hoặc `account_ids[]`) |
| GET    | `/api/admin/categories` | List tất cả venue categories (gồm inactive) |
| POST   | `/api/admin/categories` | Tạo category mới (`key`, `display_name`, `synonyms[]`, ...) |
| PATCH  | `/api/admin/categories/:id` | Cập nhật category |
| DELETE | `/api/admin/categories/:id` | Xóa category |
| GET    | `/api/admin/cities` | List tất cả cities |
| POST   | `/api/admin/cities` | Tạo city (`code`, `name`, `aliases[]`, `latitude?`, `longitude?`) |
| PATCH  | `/api/admin/cities/:id` | Cập nhật city |
| DELETE | `/api/admin/cities/:id` | Xóa city |
| GET    | `/api/admin/districts?city_id=...` | List tất cả districts |
| POST   | `/api/admin/districts` | Tạo district (`city_id`, `code`, `name`, `aliases[]`, ...) |
| PATCH  | `/api/admin/districts/:id` | Cập nhật district |
| DELETE | `/api/admin/districts/:id` | Xóa district |
| POST   | `/api/admin/venues/reindex-embeddings?force=&limit=` | Sinh lại `search_document` + embedding (HuggingFace) cho venues thiếu (default) hoặc tất cả (`force=1`). Dùng sau khi bulk-edit venues hoặc khi venues cũ chưa có embedding. |

## Public Category Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/categories` | List active venue categories (dùng cho venue form, search filter UI) |
| GET    | `/api/categories/:id` | Chi tiết category |

## Public Location Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/cities` | List active cities (TP.HCM, HN, DN) — dropdown cho venue form |
| GET    | `/api/cities/:id` | Chi tiết city |
| GET    | `/api/districts?city_id=...` | List districts, filter theo city |
| GET    | `/api/districts/:id` | Chi tiết district |

Admin CRUD đầy đủ ở `/api/admin/cities/*` và `/api/admin/districts/*` (yêu cầu JwtAuthGuard + AdminGuard).

## Venue Create/Update with Categories + Location

Cả `POST /api/venues`, `POST /api/venues/community`, `PATCH /api/venues/:id`, `POST/PATCH /api/admin/venues` nhận:
- **Address**: `address_line` (số nhà + đường), `ward?`, `city_id`, `district_id`, `latitude`, `longitude`
- **Categories**: `category_ids: string[]` + `primary_category_id?`

Venue response trả về kèm `city_ref` + `district_ref` cho hiển thị name. List endpoints (findAll/findByOwner/findByContributor) cũng eager-load categories với `is_primary` flag để FE hiển thị badge mà không cần round-trip.

## Search với location

`GET /api/search?q=<query>&lat=<float>&lng=<float>&max_distance_m=<int>&debug=<0|1>` hỗ trợ:
- Groq extract `location.{city, district, street}` từ câu search → resolve thành `city_id`/`district_id` qua alias → filter cứng
- `lat`/`lng` từ FE (GPS user, qua `useGeolocation` hook) → thêm `location` weight vào ranking (1.0 tại user point, decay `1 / (1 + d/1500)`)
- `max_distance_m` → bounding box `ST_DWithin` loại các venue quá xa
- `debug=1` → response kèm `score_breakdown { semantic, tag, name, category_match, rating, location, strategy }` cho từng venue
- Response venue có `distance_m` (chỉ khi `lat`/`lng` truyền vào) + `matched_categories` để FE render badge primary category trên card

## End-to-end search flow

1. **User tạo venue** (owner / community contribute): UI form gửi `address_line + ward + city_id + district_id + category_ids + primary_category_id` → venue-service lưu, set categories qua `setCategoriesForVenue` (atomic replace), `VenueEmbeddingService.regenerateInBackground` fire-and-forget call HF embed
2. **User để lại review**: interaction-service emit RMQ `venue.reviewed` → search-ai-service Groq phân tích → upsert `venue_tags` → trigger `trg_venue_tags_bump_usage` tự cập nhật `tags.usage_count`
3. **User search**: FE truyền `q` (và optional `lat`/`lng`) → gateway → search-ai-service:
   - Regex parse `capacity` + `time` từ query
   - Parallel: Groq extract intent/name/categories/tags/location + HF embed cleanQuery
   - LocationResolver map `"Q1"` → `district_id`
   - Provider resolve category/tag keys → ids (filter unknown keys ra)
   - Strategy chọn weights theo intent (`name` / `attribute` / `mixed` / `unclear`)
   - SQL hybrid: pgvector cosine + pg_trgm name + matched-tag SUM (time-frame filtered) + category boost + PostGIS distance + rating − excluded_tag penalty
   - Hard filters: capacity, crowd, FK city/district (when resolved), rating ≥ 4 (when `require_high_rating`), `ST_DWithin` (when `max_distance_m`), minNameScore (intent=name)
   - Relaxation fallback nếu < 5 kết quả
   - LEFT JOIN cities + districts → response chứa display name
4. **Admin operate**: `/admin/categories` quản lý loại quán + synonyms; `/admin/locations` quản lý cities/districts (cascading filter); `POST /admin/venues/reindex-embeddings` bulk-fix venues thiếu embedding

## User Report Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| POST   | `/api/reports` | User report review vi phạm (`review_id`, `reason`, `description?`) |
| POST   | `/api/venue-reports` | User report venue giả mạo / sai thông tin / vi phạm (`venue_id`, `reason`, `description?`) |

## Interaction Endpoints (User Behavior Tracking)

| Method | Path | Mô tả |
|--------|------|-------|
| POST   | `/api/interactions/view` | Track venue view của user đang đăng nhập (body `{ venue_id }`). FE gọi fire-and-forget khi mở `/venues/:id`. Insert vào `interaction_schema.user_interactions` với `interaction_type='view'`. |
| GET    | `/api/interactions/recently-viewed?limit=8` | Recently Viewed cho user — gộp theo venue qua `MAX(created_at)`, JOIN cross-schema venues + cities + districts + primary category. |

## Home-page Discovery Lists

Trang chủ (`apps/web-client/src/app/page.tsx`) render 3 section cá nhân hóa thay cho "Trending Near You" cũ:

| Section | Endpoint | Auth | Logic |
|---------|----------|------|-------|
| **Top Rated This Week** | `GET /api/venues/top-rated?days=7&limit=6` (venue-service) | Public | Cross-schema query: đếm reviews 7 ngày qua từ `interaction_schema.reviews`, rank `rating_avg * LN(recent_count + 1.5)` để rating cao + nhiều review thắng quán mới có 1 đánh giá 5 sao. Server Component, cache 5 phút. |
| **Recommended For You** | `GET /api/search/recommended?limit=6` (search-ai-service) | JwtAuthGuard | Build taste vector = `AVG(embedding)::vector` của venues user đã favorite + reviewed `rating>=4`, kNN cosine, exclude venues đã interact. Trả `[]` nếu user chưa có signal → FE ẩn section. |
| **Recently Viewed** | `POST /api/interactions/view` + `GET /api/interactions/recently-viewed?limit=8` (interaction-service) | JwtAuthGuard | FE gọi `POST` mỗi lần mở `/venues/:id`. User chưa login → FE fallback đọc `localStorage[mynook_recently_viewed]`. |
