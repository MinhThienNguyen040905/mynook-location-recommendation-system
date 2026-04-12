# CLAUDE.md — interaction-service

## Overview

NestJS HTTP microservice chạy ở **port 3004**. Xử lý logic tương tác người dùng: notifications, reviews, favorites, user interactions. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Quản lý notifications (CRUD + RMQ event handlers)
- Quản lý reviews — CRUD + emit `venue.reviewed` event để search-ai-service xử lý AI analysis
- (Planned) User Favorites, User Interactions
- Nhận thông tin account từ `x-user-id` / `x-user-type` headers (forward từ api-gateway) via `@CurrentUser()` decorator
- Lắng nghe RabbitMQ events (e.g. `user.registered`) để tạo notifications tự động
- Publish RabbitMQ events (`venue.reviewed`) khi có review mới
- **KHÔNG** import `@nestjs/passport`, `passport-jwt`, hoặc tự tạo `AuthGuard`/`JwtStrategy`

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/app.module.ts` | Root module — import NotificationModule, ReviewModule |
| **Notification Module** | |
| `src/app/modules/notification/notification.module.ts` | Notification feature module |
| `src/app/modules/notification/notification.controller.ts` | HTTP endpoints + RMQ event handlers |
| `src/app/modules/notification/notification.service.ts` | Business logic — findByAccount, markAsRead, createWelcomeNotification |
| **Review Module** | |
| `src/app/modules/review/review.module.ts` | Review feature module + RMQ publisher |
| `src/app/modules/review/review.controller.ts` | HTTP endpoints cho reviews |
| `src/app/modules/review/review.service.ts` | Business logic — findByVenue, create (+ emit event), updateAiAnalysis |
| `src/app/modules/review/dto/create-review.dto.ts` | DTO for creating reviews |

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/reviews/venue/:venueId` | No | Lấy reviews của venue |
| POST | `/reviews` | Yes (via headers) | Tạo review mới → emit `venue.reviewed` |
| PATCH | `/reviews/:reviewId/ai-analysis` | Internal only | Callback từ search-ai-service để lưu AI analysis |

## RabbitMQ Events

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `user.registered` | **Consumes** | Tạo welcome notification |
| `venue.reviewed` | **Publishes** | Khi review mới được tạo → search-ai-service xử lý AI |

## Review → AI Analysis Flow

1. User tạo review qua `POST /reviews`
2. `ReviewService.create()` save review + emit `venue.reviewed` event qua RabbitMQ
3. `search-ai-service` nhận event, gọi Groq AI phân tích
4. `search-ai-service` callback `PATCH /reviews/:id/ai-analysis` để lưu kết quả
5. Review record được update với `ai_analysis_json` chứa sentiment, tags, summary

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
- Khi thêm feature mới (favorite, etc.), tạo module riêng trong `modules/<feature>/`
