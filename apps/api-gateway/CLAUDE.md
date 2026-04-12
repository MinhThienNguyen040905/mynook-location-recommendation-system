# CLAUDE.md — api-gateway

## Overview

NestJS HTTP REST gateway chạy ở **port 3001**, prefix `/api`. Là **điểm vào duy nhất** từ frontend/internet đến hệ thống microservices.

## Vai trò trong kiến trúc

- Verify JWT (`JwtStrategy` + `JwtAuthGuard`) — **chỉ nơi duy nhất** trong toàn hệ thống làm điều này
- Forward request đến microservices qua HTTP (`@nestjs/axios`)
- Gắn `x-user-id` + `x-user-type` headers vào request forward (qua `AuthHeadersInterceptor`)
- **KHÔNG** chứa business logic — chỉ proxy + auth

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
| `src/app/common/strategies/jwt.strategy.ts` | Passport JWT strategy — verify token, extract payload |
| `src/app/common/guards/jwt-auth.guard.ts` | Guard bảo vệ route cần auth |
| `src/app/common/interceptors/auth-headers.interceptor.ts` | Gắn x-user-id + x-user-type vào req.authHeaders |
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

## Search Endpoints (route: /api/search/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/search?q=...&limit=20` | JwtAuthGuard | Hybrid search (logged-in, search logged) |
| GET | `/api/search/public?q=...&limit=20` | Public | Hybrid search (anonymous) |

## Review Endpoints (route: /api/reviews/...)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| GET | `/api/reviews/venue/:venueId` | Public | Lấy reviews của venue |
| POST | `/api/reviews` | JwtAuthGuard | Tạo review mới |

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
