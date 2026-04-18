# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **web-client** (port 3000): Next.js 16 App Router frontend.
- **api-gateway** (port 3001): the ONLY public HTTP entry point, prefixed `/api`. Forwards requests to microservices via HTTP (`@nestjs/axios`).
- **4 microservices** (auth:3002, venue:3003, interaction:3004, search-ai:3005): NestJS HTTP apps, internal only (not exposed publicly in production).
- Inter-service async events use RabbitMQ via `@mynook/rmq-messaging` (production).
- **Hybrid Search**: search-ai-service combines pgvector semantic search + tag-based filtering + capacity/time filters.
- **AI Review Processing**: interaction-service emits `venue.reviewed` → search-ai-service analyzes via Groq AI (Llama 3.3) → upserts VenueTag scores → callbacks AI analysis JSON.
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
| POST   | `/api/admin/notifications/broadcast` | Gửi thông báo tổng (`target: all \| customer \| owner` hoặc `account_ids[]`) |

## User Report Endpoint

| Method | Path | Mô tả |
|--------|------|-------|
| POST   | `/api/reports` | User report review vi phạm (`review_id`, `reason`, `description?`) |
