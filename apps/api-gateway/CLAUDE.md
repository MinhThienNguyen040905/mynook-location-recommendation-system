# CLAUDE.md — api-gateway

## Overview

NestJS HTTP REST gateway chạy ở **port 3001**, prefix `/api`. Là **điểm vào duy nhất** từ frontend/internet đến hệ thống microservices.

## Vai trò trong kiến trúc

- Verify JWT (`JwtStrategy` + `JwtAuthGuard`) — **chỉ nơi duy nhất** trong toàn hệ thống làm điều này
- Chặn truy cập admin-only bằng `AdminGuard` (kiểm tra `user.type === 'admin'`)
- Forward request đến microservices qua HTTP (`@nestjs/axios`)
- Gắn `x-user-id` + `x-user-type` headers vào request forward (qua `AuthHeadersInterceptor`)
- **KHÔNG** chứa business logic — chỉ proxy + auth (ngoại trừ admin broadcast cần fan-out auth-service → interaction-service)

## Auth Endpoints (route: /api/auth/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/api/auth/register` | Public | Đăng ký (customer/business) |
| POST | `/api/auth/login` | Public | Đăng nhập |
| POST | `/api/auth/refresh` | Public | Làm mới tokens |
| GET | `/api/auth/profile` | JwtAuthGuard | Lấy profile |
| POST | `/api/auth/forgot-password` | Public | Quên mật khẩu |
| POST | `/api/auth/reset-password` | Public | Đặt lại mật khẩu |
| POST | `/api/auth/change-password` | JwtAuthGuard | Đổi mật khẩu |
| PATCH | `/api/auth/profile` | JwtAuthGuard | Cập nhật profile |

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/common/strategies/jwt.strategy.ts` | Passport JWT strategy — verify token, extract payload (`sub`, `email`, `type`) |
| `src/app/common/guards/jwt-auth.guard.ts` | Guard bảo vệ route cần auth |
| `src/app/common/guards/admin.guard.ts` | Guard yêu cầu `user.type === 'admin'` (dùng kèm JwtAuthGuard) |
| `src/app/common/interceptors/auth-headers.interceptor.ts` | Gắn x-user-id + x-user-type vào req.authHeaders |
| `src/app/modules/admin/admin.module.ts` | Admin proxy module |
| `src/app/modules/admin/admin-user.controller.ts` | Proxy `/admin/accounts/*` → auth-service |
| `src/app/modules/admin/admin-venue.controller.ts` | Proxy `/admin/venues/*` → venue-service |
| `src/app/modules/admin/admin-review.controller.ts` | Proxy `/admin/reviews/*` + `/admin/reports/*` → interaction-service |
| `src/app/modules/admin/admin-venue-report.controller.ts` | `/admin/venue-reports/*` — resolve orchestrates venue-service (deactivate) + interaction-service (bulk-resolve) |
| `src/app/modules/admin/admin-notification.controller.ts` | `/admin/notifications/broadcast` — fan-out auth-service → interaction-service |
| `src/app/modules/admin/admin-dashboard.controller.ts` | `/admin/dashboard` — gộp stats song song từ 3 services |
| `src/app/modules/interaction/report.controller.ts` | User-facing POST `/reports` |
| `src/app/modules/interaction/venue-report.controller.ts` | User-facing POST `/venue-reports` |
| `src/app/modules/auth/auth.controller.ts` | Proxy tất cả /auth/* routes đến auth-service |
| `src/app/modules/auth/dto/auth.dto.ts` | Gateway-level Auth DTOs (Swagger docs) |
| `src/app/modules/venue/venue.controller.ts` | Proxy /venues/* routes đến venue-service |
| `src/app/modules/venue/menu.controller.ts` | Proxy /venues/:id/menu/* routes đến venue-service |
| `src/app/modules/venue/upload.controller.ts` | Proxy /upload routes đến venue-service |
| `src/app/modules/venue/dto/venue.dto.ts` | Gateway-level Venue DTOs (Swagger docs) |
| `src/app/modules/interaction/notification.controller.ts` | Proxy /notifications/* routes đến interaction-service |
| `src/app/modules/interaction/review.controller.ts` | Proxy /reviews/* routes đến interaction-service |
| `src/app/modules/search/search.controller.ts` | Proxy /search routes đến search-ai-service |
| `src/app/modules/search/search.module.ts` | Search proxy module |
| `src/app/modules/venue/category.controller.ts` | Public proxy `/categories/*` → venue-service |
| `src/app/modules/admin/admin-category.controller.ts` | Admin proxy `/admin/categories/*` → venue-service (CRUD + list all) |
| `src/app/modules/venue/location.controller.ts` | Public proxy `/cities/*`, `/districts/*` → venue-service |
| `src/app/modules/admin/admin-location.controller.ts` | Admin proxy `/admin/cities/*`, `/admin/districts/*` → venue-service |

## Search Endpoints (route: /api/search/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/search?q=...&limit=20&offset=0&debug=0&lat=&lng=&max_distance_m=` | JwtAuthGuard | AI hybrid search (logged-in, search logged). `debug=1` trả `score_breakdown`; `lat`/`lng` bật distance ranking; `max_distance_m` bounded `ST_DWithin` |
| GET | `/api/search/public?q=...&limit=20` | Public | AI hybrid search (anonymous) |

Search pipeline: Groq extract intent/name/categories/tags/location → parallel với embedding → LocationResolver (Q1 → district_id) → SQL hybrid (semantic + trigram name + matched-tags SUM + category boost + rating + PostGIS distance − excluded tags).

## Category Endpoints (route: /api/categories/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/categories` | Public | List active venue categories (dùng cho venue form + filter UI) |
| GET | `/api/categories/:id` | Public | Chi tiết category |

## Location Endpoints (route: /api/cities/... + /api/districts/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/cities` | Public | List active cities (TP.HCM, HN, DN) |
| GET | `/api/cities/:id` | Public | Chi tiết city |
| GET | `/api/districts?city_id=...` | Public | List districts (filter theo city) |
| GET | `/api/districts/:id` | Public | Chi tiết district |

Search extract (Groq) trả `location.{city, district, street}` là string; search-ai-service có `LocationResolverService` tự resolve về `city_id`/`district_id` qua alias + trigram.

## Venue Endpoints (route: /api/venues/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/venues` | Public | Lấy tất cả venues |
| GET | `/api/venues/owner/my-venues` | JwtAuthGuard | Lấy venues của owner đang đăng nhập |
| GET | `/api/venues/:id` | Public | Lấy chi tiết venue (kèm `categories[]`, `city_ref`, `district_ref`) |
| POST | `/api/venues` | JwtAuthGuard | Tạo venue mới — body: `address_line`, `ward?`, `city_id`, `district_id`, `latitude`, `longitude`, `category_ids[]?`, `primary_category_id?` |
| POST | `/api/venues/community` | JwtAuthGuard | Tạo venue đóng góp từ cộng đồng (customer/owner) |
| PATCH | `/api/venues/:id` | JwtAuthGuard | Cập nhật venue (gửi `category_ids: []` để xóa hết) |
| DELETE | `/api/venues/:id` | JwtAuthGuard | Xóa venue (soft delete) |

## Review Endpoints (route: /api/reviews/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/reviews/venue/:venueId` | Public | Lấy reviews của venue |
| POST | `/api/reviews` | JwtAuthGuard | Tạo review mới |

## Report Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/api/reports` | JwtAuthGuard | User report một review vi phạm |
| POST | `/api/venue-reports` | JwtAuthGuard | User report venue giả mạo / vi phạm |

## Admin Endpoints (route: /api/admin/...)

Tất cả cần `JwtAuthGuard + AdminGuard` (`user.type === 'admin'`).

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/api/admin/dashboard` | Dashboard tổng hợp (accounts + venues + interaction + reports) |
| GET    | `/api/admin/accounts` | List accounts (filter: `type`, `is_active`, `q`, `page`, `limit`) |
| GET    | `/api/admin/accounts/stats` | Thống kê accounts (tổng, theo type, active/inactive, 30 ngày gần nhất) |
| GET    | `/api/admin/accounts/:id` | Chi tiết account |
| PATCH  | `/api/admin/accounts/:id/status` | Khóa / mở tài khoản |
| GET    | `/api/admin/venues` | List tất cả venues (gồm inactive) |
| GET    | `/api/admin/venues/stats` | Stats venues + top hot venues + popular areas (districts) |
| GET    | `/api/admin/venues/cities` | Phân bố theo city |
| POST   | `/api/admin/venues` | Admin tạo venue |
| PATCH  | `/api/admin/venues/:id` | Admin cập nhật venue |
| PATCH  | `/api/admin/venues/:id/restore` | Khôi phục venue đã soft-delete |
| DELETE | `/api/admin/venues/:id` | Soft-delete venue |
| DELETE | `/api/admin/venues/:id/hard` | Xóa vĩnh viễn venue |
| GET    | `/api/admin/reviews` | List reviews |
| DELETE | `/api/admin/reviews/:id` | Xóa review |
| GET    | `/api/admin/reports` | List reports (filter: `status`) |
| GET    | `/api/admin/reports/stats` | Stats reports |
| GET    | `/api/admin/reports/:id` | Chi tiết report kèm review gốc |
| PATCH  | `/api/admin/reports/:id/resolve` | Xử lý review report (`{ action: 'delete' \| 'dismiss' }`) |
| GET    | `/api/admin/venue-reports` | List venue reports |
| GET    | `/api/admin/venue-reports/stats` | Stats venue reports |
| GET    | `/api/admin/venue-reports/:id` | Chi tiết venue report |
| PATCH  | `/api/admin/venue-reports/:id/resolve` | Xử lý venue report (`{ action: 'deactivate' \| 'dismiss' }`) — `deactivate` sẽ orchestrate: soft-delete venue (venue-service) rồi bulk-resolve tất cả report pending của venue |
| POST   | `/api/admin/notifications/broadcast` | Gửi thông báo tổng (`target: 'all' \| 'customer' \| 'owner'` hoặc `account_ids[]`) |
| GET    | `/api/admin/categories` | List tất cả venue categories (active + inactive) |
| POST   | `/api/admin/categories` | Tạo venue category (`key`, `display_name`, `synonyms[]`, `description?`, `display_order?`, `is_active?`) |
| PATCH  | `/api/admin/categories/:id` | Cập nhật venue category |
| DELETE | `/api/admin/categories/:id` | Xóa venue category |
| GET    | `/api/admin/cities` | List tất cả cities |
| POST   | `/api/admin/cities` | Tạo city (`code`, `name`, `aliases[]`, `latitude?`, `longitude?`) |
| PATCH  | `/api/admin/cities/:id` | Cập nhật city |
| DELETE | `/api/admin/cities/:id` | Xóa city |
| GET    | `/api/admin/districts?city_id=...` | List tất cả districts |
| POST   | `/api/admin/districts` | Tạo district (`city_id`, `code`, `name`, `aliases[]`, ...) |
| PATCH  | `/api/admin/districts/:id` | Cập nhật district |
| DELETE | `/api/admin/districts/:id` | Xóa district |

## Pattern chuẩn — Route cần auth

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

## Pattern chuẩn — Route cần auth + forward body

```typescript
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuthHeadersInterceptor)
@Post('some-endpoint')
async handler(
  @Request() req: { authHeaders: Record<string, string> },
  @Body() body: SomeDto,
) {
  const { data } = await firstValueFrom(
    this.http.post(`${SERVICE_URL}/endpoint`, body, { headers: req.authHeaders }),
  );
  return data;
}
```

## Service URLs

Định nghĩa trong `@mynook/shared-types`, override bằng env vars:

| Constant | Env Var | Default |
|----------|---------|---------|
| `AUTH_SERVICE_URL` | `AUTH_SERVICE_URL` | `http://localhost:3002` |
| `VENUE_SERVICE_URL` | `VENUE_SERVICE_URL` | `http://localhost:3003` |
| `INTERACTION_SERVICE_URL` | `INTERACTION_SERVICE_URL` | `http://localhost:3004` |
| `SEARCH_AI_SERVICE_URL` | `SEARCH_AI_SERVICE_URL` | `http://localhost:3005` |

## Environment Variables

```env
JWT_SECRET=mynook-dev-secret
AUTH_SERVICE_URL=http://localhost:3002
VENUE_SERVICE_URL=http://localhost:3003
INTERACTION_SERVICE_URL=http://localhost:3004
SEARCH_AI_SERVICE_URL=http://localhost:3005
```

## Conventions

- Controllers được nhóm theo downstream service trong `src/app/modules/` (auth/, venue/, interaction/, search/)
- Gateway KHÔNG chứa `@InjectRepository`, TypeORM, hay bất kỳ DB logic nào
- Gateway KHÔNG forward `Authorization` header xuống downstream services
- Chỉ Gateway có `JwtStrategy` và `JwtAuthGuard`
