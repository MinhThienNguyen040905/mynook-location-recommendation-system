# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **api-gateway** (port 3000): the ONLY public HTTP entry point, prefixed `/api`. Forwards requests to microservices via HTTP (`@nestjs/axios`).
- **4 microservices** (auth:3001, venue:3002, interaction:3003, search-ai:3004): NestJS HTTP apps, internal only (not exposed publicly in production).
- **web-client**: Next.js 16 App Router frontend.
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
| shared-types | `@mynook/shared-types` | Enums (UserRole, VenueCategory, BookingStatus), interfaces (IUser, IVenue, IReview), service URL constants (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.) |
| database | `@mynook/database` | DB connection config, entity schemas |
| rmq-messaging | `@mynook/rmq-messaging` | `RmqModule.register()` for RabbitMQ client/server setup |

## Key Conventions

- API Gateway communicates with microservices via HTTP REST using `@nestjs/axios` (HttpService).
- Service URL constants are defined in `@mynook/shared-types` (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.), configurable via environment variables.
- Each microservice is a standard NestJS HTTP app with its own port.
- TypeScript strict mode is enabled. Module resolution is `nodenext`.
- Nx workspace uses `@nx/js/typescript`, `@nx/next/plugin`, and `@nx/webpack/plugin` inferred targets.

## Port Assignments

| Service | Port | Transport |
|---------|------|-----------|
| web-client | 3000 (dev) | HTTP |
| api-gateway | 3000 | HTTP REST |
| auth-service | 3001 | HTTP |
| venue-service | 3002 | HTTP |
| interaction-service | 3003 | HTTP |
| search-ai-service | 3004 | HTTP |

Note: web-client and api-gateway share port 3000 by default. When running together, Next.js auto-selects the next available port.

## Quy chuẩn Xác thực & Giao tiếp (Authentication & Communication Guidelines)

Hệ thống áp dụng mô hình **API Gateway Authentication Offloading**. Mọi logic xác thực JWT được xử lý tập trung tại API Gateway — các downstream service KHÔNG tự giải mã token.

### Rule 1: Gateway là nơi DUY NHẤT xác thực JWT

- `JwtStrategy` và `JwtAuthGuard` chỉ tồn tại tại `apps/api-gateway/src/app/strategies/` và `apps/api-gateway/src/app/guards/`.
- API Gateway là nơi duy nhất giữ và sử dụng `JWT_SECRET` để verify token.
- Các downstream services (venue-service, interaction-service, search-ai-service) **TUYỆT ĐỐI KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`.
- auth-service giữ `JwtModule` chỉ để **sign** token (login/register), KHÔNG dùng để verify request.

### Rule 2: Gateway forward thông tin user qua custom headers

- Sau khi verify JWT thành công, Gateway map payload thành headers:
  - `x-user-id` ← `payload.sub` (UUID của user)
  - `x-user-role` ← `payload.role` (UserRole enum)
- Sử dụng `AuthHeadersInterceptor` + helper `buildUserHeaders()` từ `apps/api-gateway/src/app/interceptors/auth-headers.interceptor.ts`.
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

### Rule 3: Downstream services dùng @CurrentUser() để lấy thông tin user

- Khi tạo bất kỳ API Controller nào ở service con cần thông tin user, **PHẢI** dùng decorator `@CurrentUser()` (import từ `@mynook/shared-types`).
- Decorator đọc giá trị từ `x-user-id` và `x-user-role` headers và trả về `CurrentUserPayload { id, role }`.
- **KHÔNG** dùng `@UseGuards(AuthGuard('jwt'))` ở service con.
- **KHÔNG** import bất kỳ package JWT/Passport nào vào service con (trừ auth-service cần JwtModule để sign token).
- Pattern sử dụng trong downstream controller:
  ```typescript
  import { CurrentUser, CurrentUserPayload } from '@mynook/shared-types';

  @Get('my-resource')
  getMyResource(@CurrentUser() user: CurrentUserPayload) {
    // user.id   — authenticated user's UUID
    // user.role — authenticated user's role (UserRole enum)
    return this.service.findByUserId(user.id);
  }
  ```
