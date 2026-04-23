# CLAUDE.md — venue-service

## Overview

NestJS HTTP microservice chạy ở **port 3003**. Xử lý toàn bộ logic quản lý địa điểm (venues), menu, và thông tin liên quan. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- CRUD venues cho owner
- Community venue contribution (customer/owner đều tạo được, ai cũng có thể edit)
- Quản lý menu (categories + items)
- Nhận thông tin account từ `x-user-id` / `x-user-type` headers (forward từ api-gateway) via `@CurrentUser()` decorator
- **KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/venues/owner` | x-user-id header | Lấy danh sách venues của owner đang đăng nhập |
| GET | `/venues/:id` | Public | Lấy chi tiết venue theo ID |
| POST | `/venues` | x-user-id header | Tạo venue mới (owner) |
| POST | `/venues/community` | x-user-id header | Tạo venue đóng góp từ cộng đồng (customer/owner) |
| PATCH | `/venues/:id` | x-user-id header | Cập nhật venue (owner sở hữu hoặc community venue — ai cũng edit được) |
| DELETE | `/venues/:id` | x-user-id header | Xóa mềm venue (set is_active = false) |

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

## DTOs

| File | Dùng cho |
|------|----------|
| `create-venue.dto.ts` | name, branch_name?, description?, address, city?, district?, latitude, longitude, total_capacity?, max_group_size?, is_group_friendly?, media?, opening_hours? |
| `update-venue.dto.ts` | Tất cả fields optional (partial update) |

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
| address | text | required |
| city | varchar(100) | default: 'Ho Chi Minh' |
| district | varchar(100) | nullable |
| latitude | float | required |
| longitude | float | required |
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

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/app.module.ts` | Root module — import VenueModule, MenuModule, UploadModule |
| `src/app/modules/venue/venue.module.ts` | Venue feature module |
| `src/app/modules/venue/venue.controller.ts` | REST endpoints cho venue CRUD |
| `src/app/modules/venue/venue.service.ts` | Business logic — findByOwner, findById, create, createCommunity, update, remove |
| `src/app/modules/venue/dto/` | DTOs: create-venue.dto.ts, update-venue.dto.ts |
| `src/app/modules/menu/menu.module.ts` | Menu feature module |
| `src/app/modules/menu/menu.controller.ts` | REST endpoints cho menu categories + items |
| `src/app/modules/menu/menu.service.ts` | Business logic menu CRUD |
| `src/app/modules/menu/dto/menu.dto.ts` | DTOs: CreateCategoryDto, CreateMenuItemDto, etc. |
| `src/app/modules/upload/upload.module.ts` | Upload feature module |
| `src/app/modules/upload/upload.controller.ts` | Upload images/videos to Cloudinary |

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
