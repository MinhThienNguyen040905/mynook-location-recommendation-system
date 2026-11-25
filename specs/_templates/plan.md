---
spec: NNN
status: draft          # draft | approved
updated: YYYY-MM-DD
---

# Plan NNN — <Tên tính năng>

> Plan mô tả **LÀM THẾ NÀO** để hiện thực `spec.md`. Mỗi quyết định phải truy được về FR/AC trong spec.

## 1. Tóm tắt giải pháp

<2–5 câu mô tả cách tiếp cận.>

## 2. Constitution Check

| Nguyên tắc | Tuân thủ? | Ghi chú |
|---|---|---|
| II.1 Gateway là cửa duy nhất | ✅ / ❌ | |
| II.2 Chỉ owner ghi schema | ✅ / ❌ | |
| II.3 HTTP vs RMQ đúng chỗ, consumer idempotent | ✅ / ❌ / N/A | |
| III Migration mới, không sửa migration cũ | ✅ / ❌ / N/A | |
| IV AI có sanitize + fallback | ✅ / ❌ / N/A | |
| V Swagger, DTO validation, guard, rate limit | ✅ / ❌ | |
| VI FE dùng lib/api + React Query | ✅ / ❌ / N/A | |

### Ngoại lệ

<Nếu có ❌: lý do và phương án thay thế đã cân nhắc.>

## 3. Service bị ảnh hưởng

| App / lib | Thay đổi |
|---|---|
| api-gateway | |
| <service> | |
| libs/database | |
| libs/shared-types | |
| web-client | |

## 4. Mô hình dữ liệu

- Migration mới: `libs/database/src/lib/migrations/NNN_<mo_ta>.sql`
- Bảng / cột / index thay đổi:

```sql
-- phác thảo DDL
```

## 5. API contract

### Gateway (public)

| Method | Path | Auth | Request | Response | Rate limit |
|---|---|---|---|---|---|
| GET | `/api/...` | JWT / public / admin | | | |

### Internal (service ↔ service)

| Gọi từ | Tới | Method + path | Mục đích |
|---|---|---|---|

## 6. Event (RabbitMQ)

| Routing key | Publisher | Consumer | Payload | Idempotent bằng cách |
|---|---|---|---|---|

## 7. Frontend

- Route / page:
- Component:
- API client (`src/lib/api/...`):
- Query key React Query:

## 8. Xử lý lỗi & fallback

- <Dịch vụ X lỗi → hành vi Y>

## 9. Kiểm thử

| AC | Cách kiểm chứng (unit / e2e / thủ công) |
|---|---|
| AC-1.1 | |

## 10. Rủi ro & phương án thay thế đã cân nhắc

- 
