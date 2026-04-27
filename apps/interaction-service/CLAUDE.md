# CLAUDE.md — interaction-service

## Overview

NestJS HTTP microservice chạy ở **port 3004**. Xử lý logic tương tác người dùng: notifications, reviews, favorites, user interactions. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Quản lý notifications (CRUD + RMQ event handlers)
- Quản lý reviews — CRUD + emit `venue.reviewed` event để search-ai-service xử lý AI analysis
- Quản lý user interactions: track view + recently-viewed venues (ghi `interaction_schema.user_interactions` với `interaction_type='view'`)
- (Planned) User Favorites
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
| **Report Module** (gộp review-report + venue-report trong cùng module) | |
| `src/app/modules/report/report.module.ts` | Module chung — đăng ký cả 2 controllers/services + TypeORM repos (Review, ReviewReport, VenueReport) |
| `src/app/modules/report/review-report.controller.ts` | User POST `/reports` + admin `/reports/admin/*` |
| `src/app/modules/report/review-report.service.ts` | createReport, list, findById, resolve, stats |
| `src/app/modules/report/venue-report.controller.ts` | User POST `/venue-reports` + admin `/venue-reports/admin/*` |
| `src/app/modules/report/venue-report.service.ts` | create, list, findById, updateStatus, bulkResolveByVenue, stats |
| `src/app/modules/report/dto/review-report.dto.ts` | CreateReviewReportDto, ResolveReviewReportDto |
| `src/app/modules/report/dto/venue-report.dto.ts` | CreateVenueReportDto, UpdateVenueReportStatusDto |
| **Interactions Module** | |
| `src/app/modules/interactions/interactions.module.ts` | Module — TypeOrmFeature `UserInteraction` |
| `src/app/modules/interactions/interactions.controller.ts` | `POST /interactions/view` (body `{venue_id}`) + `GET /interactions/recently-viewed?limit=8` |
| `src/app/modules/interactions/interactions.service.ts` | `trackView(accountId, venueId)` insert raw SQL với `interaction_type='view'`. `recentlyViewed(accountId, limit)` dùng CTE `MAX(created_at) GROUP BY venue_id` để gộp view trùng + cross-schema JOIN venues + cities + districts + primary category |
| **Admin Module** | |
| `src/app/modules/admin/admin.module.ts` | Admin module (review moderation + broadcast + stats) |
| `src/app/modules/admin/admin.controller.ts` | `/admin/interaction/*` routes |
| `src/app/modules/admin/admin.service.ts` | listReviews, deleteReview, broadcast (batch insert), stats |
| `src/app/modules/admin/dto/broadcast.dto.ts` | BroadcastNotificationDto |

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/reviews/venue/:venueId` | No | Lấy reviews của venue |
| POST | `/reviews` | Yes (via headers) | Tạo review mới → emit `venue.reviewed` |
| PATCH | `/reviews/:reviewId/ai-analysis` | Internal only | Callback từ search-ai-service để lưu AI analysis |
| POST | `/reports` | Yes (via headers) | User report review vi phạm |
| POST | `/venue-reports` | Yes (via headers) | User report venue giả mạo / vi phạm |
| POST | `/interactions/view` | Yes (via headers) | Track user vừa xem một venue (`interaction_type='view'`) |
| GET  | `/interactions/recently-viewed?limit=8` | Yes (via headers) | Recently viewed venues của user — gộp theo venue, sort `MAX(created_at) DESC` |

## Admin Endpoints (Internal — protected by AdminGuard ở gateway)

| Method | Path | Mô tả |
|--------|------|-------|
| GET    | `/admin/interaction/reviews` | List reviews (filter: `venue_id`, `account_id`, pagination) |
| DELETE | `/admin/interaction/reviews/:id` | Admin xóa review |
| POST   | `/admin/interaction/notifications/broadcast` | Insert notifications cho `account_ids[]` (batch 500) |
| GET    | `/admin/interaction/stats` | Tổng reviews, reviews 30 ngày, favorites, unread notifs, avg rating |
| GET    | `/reports/admin` | List reports (filter: `status`, pagination) — kèm review gốc |
| GET    | `/reports/admin/stats` | Stats: pending, resolved_deleted, dismissed |
| GET    | `/reports/admin/:id` | Chi tiết report |
| PATCH  | `/reports/admin/:id/resolve` | `action: 'delete'` → xóa review + đánh dấu report; `'dismiss'` → chỉ dismiss |
| GET    | `/venue-reports/admin` | List venue reports (filter: `status`, `venue_id`) |
| GET    | `/venue-reports/admin/stats` | Stats venue reports |
| GET    | `/venue-reports/admin/:id` | Chi tiết venue report |
| PATCH  | `/venue-reports/admin/:id/status` | Đổi status (`resolved_deactivated \| dismissed`) — gateway gọi sau khi đã deactivate venue |
| PATCH  | `/venue-reports/admin/venue/:venueId/bulk-resolve` | Bulk-mark tất cả report pending của venue thành `resolved_deactivated` |

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

- `Notification`, `Review`, `UserFavorite`, `UserInteraction`, `ReviewReport`, `VenueReport` (từ `@mynook/database`)

### Table: `interaction_schema.review_reports`

Lưu mỗi lần user report review. Xem migration `libs/database/src/lib/migrations/004_add_review_reports.sql`.

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| review_id | uuid | FK → reviews |
| reporter_account_id | uuid | người report |
| reason | varchar(100) | lý do (spam, offensive, fake, ...) |
| description | text | nullable — mô tả thêm |
| status | enum | pending / resolved_deleted / dismissed |
| resolved_by | uuid | nullable — admin đã xử lý |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | auto |

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
