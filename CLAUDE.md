# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **web-client** (port 3000): Next.js 16 App Router frontend.
- **api-gateway** (port 3001): the ONLY public HTTP entry point, prefixed `/api`. Forwards requests to microservices via HTTP (`@nestjs/axios`).
- **4 microservices** (auth:3002, venue:3003, interaction:3004, search-ai:3005): NestJS HTTP apps, internal only (not exposed publicly in production).
- Inter-service async events use RabbitMQ via `@mynook/rmq-messaging` (production).

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
| shared-types | `@mynook/shared-types` | Enums (AccountType, VenueCategory, BookingStatus), interfaces (IAccount, IVenue, IReview), service URL constants (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.) |
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
  - `modules/interaction/` → forward đến interaction-service (notification controller)
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
- Mọi dữ liệu tương tác (review, log, favorite, notification) đều liên kết qua cột `account_id`.
- Bảng: `auth_schema.accounts` (thay thế `auth_schema.users`).
- JWT payload chứa `type` (AccountType) thay vì `role`.
- Header forwarding: `x-user-type` (thay vì `x-user-role`).
- `CurrentUserPayload` có trường `type` (thay vì `role`).
