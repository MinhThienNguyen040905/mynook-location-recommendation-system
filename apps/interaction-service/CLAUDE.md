# CLAUDE.md — interaction-service

## Overview

NestJS HTTP microservice chạy ở **port 3004**. Xử lý logic tương tác người dùng: notifications, reviews, favorites, user interactions. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Quản lý notifications (CRUD + RMQ event handlers)
- (Planned) Reviews, User Favorites, User Interactions
- Nhận thông tin account từ `x-user-id` / `x-user-type` headers (forward từ api-gateway) via `@CurrentUser()` decorator
- Lắng nghe RabbitMQ events (e.g. `user.registered`) để tạo notifications tự động
- **KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/app.module.ts` | Root module — import NotificationModule |
| `src/app/modules/notification/notification.module.ts` | Notification feature module |
| `src/app/modules/notification/notification.controller.ts` | HTTP endpoints + RMQ event handlers |
| `src/app/modules/notification/notification.service.ts` | Business logic — findByAccount, markAsRead, createWelcomeNotification |

## Database Entities

- `Notification`, `Review`, `UserFavorite`, `UserInteraction` (từ `@mynook/database`)

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3004
RABBITMQ_URL=amqp://localhost:5672
```

## Conventions

- KHÔNG import `@nestjs/passport` hoặc `passport-jwt`
- KHÔNG verify JWT — api-gateway đã verify rồi
- Dùng `@CurrentUser()` (từ `@mynook/shared-types`) để đọc `x-user-id` / `x-user-type` headers
- Khi thêm feature mới (review, favorite, etc.), tạo module riêng trong `modules/<feature>/`
