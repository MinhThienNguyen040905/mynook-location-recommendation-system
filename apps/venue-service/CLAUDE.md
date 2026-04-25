# CLAUDE.md — venue-service

## Overview

NestJS HTTP microservice chạy ở **port 3003**. Xử lý toàn bộ logic quản lý địa điểm (venues), menu, và thông tin liên quan. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- CRUD venues cho owner
- Community venue contribution (customer/owner đều tạo được, ai cũng có thể edit)
- Quản lý menu (menu categories + items — lưu ý: khác với **venue categories** bên dưới)
- **Quản lý venue categories** (cafe, restaurant, hotpot, ...) + junction `venue_categories` (M:N) — master list cho AI search lọc loại địa điểm
- **Quản lý location taxonomy** (cities, districts) với aliases + PostGIS centroid — master tables thay cho text `city`/`district` cũ. Venue giờ FK về `city_id` + `district_id`; `venues.location` là PostGIS `geography(Point)` auto-generated từ `(longitude, latitude)`.
- **Auto-sinh embedding** mỗi khi venue create/update qua `VenueEmbeddingService` (HuggingFace `all-MiniLM-L6-v2`, 384-dim). Fire-and-forget — không block HTTP response. Admin có thể bulk-fix qua `POST /admin/venues/reindex-embeddings`.
- Nhận thông tin account từ `x-user-id` / `x-user-type` headers (forward từ api-gateway) via `@CurrentUser()` decorator
- **KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/venues/owner` | x-user-id header | Lấy danh sách venues của owner đang đăng nhập |
| GET | `/venues/:id` | Public | Lấy chi tiết venue theo ID (kèm `categories[]`) |
| POST | `/venues` | x-user-id header | Tạo venue mới (owner) — hỗ trợ `category_ids[]`, `primary_category_id?` |
| POST | `/venues/community` | x-user-id header | Tạo venue đóng góp từ cộng đồng (customer/owner) |
| PATCH | `/venues/:id` | x-user-id header | Cập nhật venue — gửi `category_ids: []` để xóa hết categories |
| DELETE | `/venues/:id` | x-user-id header | Xóa mềm venue (set is_active = false) |
| GET | `/categories` | Public | List active venue categories |
| GET | `/categories/all` | Admin (via gateway) | List tất cả categories gồm inactive |
| GET | `/categories/:id` | Public | Chi tiết category |
| POST | `/categories` | Admin (via gateway) | Tạo category mới |
| PATCH | `/categories/:id` | Admin (via gateway) | Cập nhật category |
| DELETE | `/categories/:id` | Admin (via gateway) | Xóa category |
| GET | `/cities` | Public | List active cities |
| GET | `/cities/all` | Admin (via gateway) | List tất cả cities |
| GET | `/cities/:id` | Public | Chi tiết city |
| POST | `/cities` | Admin (via gateway) | Tạo city |
| PATCH | `/cities/:id` | Admin (via gateway) | Cập nhật city |
| DELETE | `/cities/:id` | Admin (via gateway) | Xóa city |
| GET | `/districts` | Public | List districts (filter `?city_id=`) |
| GET | `/districts/all` | Admin (via gateway) | List tất cả districts |
| GET | `/districts/:id` | Public | Chi tiết district |
| POST | `/districts` | Admin (via gateway) | Tạo district |
| PATCH | `/districts/:id` | Admin (via gateway) | Cập nhật district |
| DELETE | `/districts/:id` | Admin (via gateway) | Xóa district |

## Admin Endpoints (Internal — protected by AdminGuard ở gateway)

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/admin/venues` | List venues (filter: `is_active`, `is_community_contributed`, `city`, `district`, `q`, pagination) |
| GET    | `/admin/venues/stats` | Tổng, active/inactive, community; top 10 hot venues; top 10 popular areas theo district |
| GET    | `/admin/venues/cities` | Phân bố venue theo city |
| POST   | `/admin/venues` | Admin tạo venue (`owner_id = admin.id`) |
| PATCH  | `/admin/venues/:id` | Cập nhật bất kỳ venue nào |
| PATCH  | `/admin/venues/:id/restore` | Khôi phục venue đã soft-delete |
| DELETE | `/admin/venues/:id` | Soft-delete (set `is_active = false`) |
| DELETE | `/admin/venues/:id/hard` | Xóa vĩnh viễn |
| POST   | `/admin/venues/reindex-embeddings?force=&limit=` | Bulk re-generate `search_document` + embedding. Default chỉ chạy cho venues `embedding IS NULL`; `force=1` chạy cho mọi venue active. `limit` cap tại 200/lần. Trả `{ processed, ok, failed }`. |

## DTOs

| File | Dùng cho |
|------|----------|
| `venue/dto/create-venue.dto.ts` | name, branch_name?, description?, **address_line, ward?, city_id, district_id**, latitude, longitude, total_capacity?, max_group_size?, is_group_friendly?, media?, opening_hours?, **category_ids?**, **primary_category_id?** |
| `venue/dto/update-venue.dto.ts` | Tất cả fields optional (partial update). `category_ids: []` → xóa sạch categories; `undefined` → giữ nguyên |
| `category/dto/category.dto.ts` | `CreateCategoryDto` (key, display_name, synonyms?, description?, display_order?, is_active?) + `UpdateCategoryDto` (partial) |
| `location/dto/location.dto.ts` | `CreateCityDto`, `UpdateCityDto`, `CreateDistrictDto`, `UpdateDistrictDto` — aliases normalize về lowercase khi lưu |

## Database Entities

Schema: `venue_schema`

### Table: `venues`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| owner_id | uuid | FK → auth_schema.accounts |
| branch_name | varchar(100) | nullable |
| name | varchar(255) | required |
| description | text | nullable |
| address_line | varchar(255) | nullable — số nhà + tên đường (migration 008) |
| ward | varchar(100) | nullable — phường/xã |
| city_id | uuid | FK → venue_schema.cities |
| district_id | uuid | FK → venue_schema.districts |
| latitude | float | required |
| longitude | float | required |
| location | geography(Point, 4326) | GENERATED từ (longitude, latitude) — PostGIS |
| media | jsonb | default: [] |
| total_capacity | int | default: 50 |
| max_group_size | int | default: 10 |
| is_group_friendly | boolean | default: false |
| current_crowd_level | enum | empty/moderate/crowded/full, default: moderate |
| is_active | boolean | default: true (soft delete) |
| opening_hours | jsonb | nullable |
| rating_avg | float | default: 0 |
| review_count | int | default: 0 |
| is_community_contributed | boolean | default: false — venue do cộng đồng đóng góp |
| contributed_by | uuid | nullable, FK → auth_schema.accounts — người đóng góp |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### Table: `menu_categories`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| venue_id | uuid | FK → venues |
| name | varchar(100) | required |
| display_order | int | default: 0 |

### Table: `menu_items`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| category_id | uuid | FK → menu_categories |
| venue_id | uuid | FK → venues |
| name | varchar(255) | required |
| price | decimal(10,2) | required |
| image_url | text | nullable |
| is_available | boolean | default: true |

### Table: `categories` (venue taxonomy — seeded by migration 007)

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| key | varchar(50) | UNIQUE — snake_case stable key (`cafe`, `hotpot`, ...) |
| display_name | varchar(100) | VN label (`Quán cà phê`) |
| synonyms | text[] | Danh sách synonyms để Groq map query tự do về key này |
| description | text | Mô tả đưa vào Groq prompt để phân biệt ngữ cảnh |
| display_order | int | sắp xếp UI |
| is_active | boolean | default: true |

### Table: `venue_categories`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| venue_id | uuid | FK → venues, ON DELETE CASCADE |
| category_id | uuid | FK → categories, ON DELETE CASCADE |
| is_primary | boolean | chỉ tối đa 1 row/venue có `is_primary = true` (partial unique index) |
| UNIQUE (venue_id, category_id) | | |

### Table: `cities` (migration 008)

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| code | varchar(10) | UNIQUE — `HCM`, `HN`, `DN` |
| name | varchar(100) | `Hồ Chí Minh` |
| aliases | text[] | lowercase, e.g. `{hcm,tphcm,saigon,sg}` — resolver dùng `= ANY(aliases)` |
| centroid | geography(Point, 4326) | trung tâm thành phố |
| is_active | boolean | |

### Table: `districts` (migration 008)

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| city_id | uuid | FK → cities |
| code | varchar(20) | `Q1`, `TD`, `HK` |
| name | varchar(100) | `Quận 1` |
| aliases | text[] | `{q1,quan 1,district 1,d1}` |
| centroid | geography(Point, 4326) | |
| is_active | boolean | |
| UNIQUE (city_id, code) | | |

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/app.module.ts` | Root module — import VenueModule, MenuModule, UploadModule, AdminVenueModule, CategoryModule |
| `src/app/modules/venue/venue.module.ts` | Venue feature module (import CategoryModule để set categories khi create/update) |
| `src/app/modules/venue/venue.controller.ts` | REST endpoints cho venue CRUD |
| `src/app/modules/venue/venue.service.ts` | Business logic — `findByOwner/findById` (kèm categories + `is_primary`), `findAll` etc. tự `attachCategories()` qua single SQL pass. Create/update fire-and-forget call `embeddingService.regenerateInBackground(id)` để sinh embedding. Update có `isSearchRelevantChange` guard: chỉ re-embed khi name/branch/desc/address đổi. |
| `src/app/modules/venue/embedding.service.ts` | `VenueEmbeddingService` — gọi HuggingFace (`all-MiniLM-L6-v2`, 384-dim) với timeout 5s. Build `search_document` từ name+branch+desc+ward+district+city. `regenerate(id)` synchronous, `regenerateInBackground(id)` fire-and-forget swallow errors. Update DB qua raw SQL để cast pgvector. |
| `src/app/modules/venue/dto/` | DTOs: create-venue.dto.ts, update-venue.dto.ts (có category_ids, primary_category_id) |
| `src/app/modules/category/category.module.ts` | Venue category feature module |
| `src/app/modules/category/category.controller.ts` | REST endpoints cho category CRUD (public GET + admin CRUD via gateway) |
| `src/app/modules/category/category.service.ts` | `findAllActive/findAll/findById/create/update/remove`, `getCategoriesForVenue`, `setCategoriesForVenue` |
| `src/app/modules/category/dto/category.dto.ts` | `CreateCategoryDto`, `UpdateCategoryDto` |
| `src/app/modules/location/location.module.ts` | City + District CRUD module |
| `src/app/modules/location/location.controller.ts` | REST endpoints `/cities/*`, `/districts/*` (public GET + admin CRUD via gateway) |
| `src/app/modules/location/location.service.ts` | CRUD helpers; centroid stored via raw `ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography` |
| `src/app/modules/location/dto/location.dto.ts` | City + District DTOs (create/update) |
| `src/app/modules/menu/menu.module.ts` | Menu feature module |
| `src/app/modules/menu/menu.controller.ts` | REST endpoints cho menu categories + items |
| `src/app/modules/menu/menu.service.ts` | Business logic menu CRUD |
| `src/app/modules/menu/dto/menu.dto.ts` | DTOs: CreateCategoryDto, CreateMenuItemDto, etc. |
| `src/app/modules/upload/upload.module.ts` | Upload feature module |
| `src/app/modules/upload/upload.controller.ts` | Upload images/videos to Cloudinary |
| `src/app/modules/admin/admin.module.ts` | Admin venue CRUD (gán `owner_id = admin.id`, cũng nhận `category_ids`) |

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3003
```

## Conventions

- KHÔNG import `@nestjs/passport` hoặc `passport-jwt`
- KHÔNG verify JWT — api-gateway đã verify rồi
- Dùng `@CurrentUser()` (từ `@mynook/shared-types`) để đọc `x-user-id` / `x-user-type` headers
- Xóa venue = soft delete (set `is_active = false`)
- Owner chỉ có thể update/delete venue mình sở hữu (check `owner_id`)
- **Community venues** (`is_community_contributed = true`): bất kỳ user đã đăng nhập nào cũng có thể tạo (POST `/venues/community`) và update (PATCH `/venues/:id`). Không có owner quản lý — `owner_id` để null, `contributed_by` lưu UUID người đóng góp ban đầu
