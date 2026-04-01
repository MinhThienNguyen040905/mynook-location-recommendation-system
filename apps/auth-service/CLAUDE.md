# CLAUDE.md — auth-service

## Overview

NestJS HTTP microservice chạy ở **port 3001**. Xử lý toàn bộ logic xác thực và quản lý người dùng. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Ký JWT (sign) khi login/register — KHÔNG verify request JWT (chỉ api-gateway mới verify)
- Lưu trữ users trong PostgreSQL schema `auth_schema`
- Nhận thông tin user từ `x-user-id` / `x-user-role` headers (forward từ api-gateway) via `@CurrentUser()` decorator

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/register` | Public | Đăng ký (user/owner) |
| POST | `/auth/login` | Public | Đăng nhập → trả tokens + user |
| POST | `/auth/refresh` | Public | Làm mới access_token |
| GET | `/auth/profile` | x-user-id header | Lấy profile |
| POST | `/auth/forgot-password` | Public | Tạo reset token (dev: trả trong response) |
| POST | `/auth/reset-password` | Public | Đặt lại mật khẩu bằng token |
| POST | `/auth/change-password` | x-user-id header | Đổi mật khẩu (cần mật khẩu cũ) |
| PATCH | `/auth/profile` | x-user-id header | Cập nhật tên, SĐT, avatar |

## DTOs

| File | Dùng cho |
|------|----------|
| `register.dto.ts` | email, password, full_name?, phone_number?, role? (user\|owner) |
| `login.dto.ts` | email, password |
| `refresh-token.dto.ts` | refresh_token |
| `forgot-password.dto.ts` | email |
| `reset-password.dto.ts` | token, new_password |
| `change-password.dto.ts` | old_password, new_password |
| `update-profile.dto.ts` | full_name?, phone_number?, avatar_url? |

## User Entity — Database columns

Schema: `auth_schema`, Table: `users`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| email | varchar(255) | unique |
| password_hash | varchar(255) | nullable (OAuth users) |
| full_name | varchar(100) | nullable |
| avatar_url | text | nullable |
| phone_number | varchar(20) | nullable |
| role | enum | user/owner/admin, default: user |
| trust_score | int | default: 100 |
| is_active | boolean | default: true |
| password_reset_token | varchar(255) | nullable — SHA-256 hash của raw token |
| password_reset_expires | timestamptz | nullable — hết hạn sau 1 giờ |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### SQL Migration — thêm các cột password reset

```sql
ALTER TABLE auth_schema.users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
```

## Forgot Password Flow

1. `POST /auth/forgot-password { email }` → tạo `rawToken` (32 bytes hex)
2. Hash token bằng SHA-256, lưu vào `password_reset_token` + đặt `password_reset_expires` = now + 1h
3. **Dev mode**: trả `dev_reset_token` thẳng trong response
4. **Production TODO**: gửi email chứa link `<FRONTEND_URL>/reset-password?token=<rawToken>`
5. `POST /auth/reset-password { token, new_password }` → hash token → tìm trong DB → đổi mật khẩu → xóa token

## JWT Tokens

| Token | Secret env var | Expiry env var | Default |
|-------|----------------|----------------|---------|
| access_token | `JWT_SECRET` | `JWT_ACCESS_EXPIRES_IN` | 15m |
| refresh_token | `JWT_REFRESH_SECRET` | `JWT_REFRESH_EXPIRES_IN` | 7d |

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=mynook-dev-secret
JWT_REFRESH_SECRET=mynook-refresh-dev-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
AUTH_SERVICE_PORT=3001
```

## Conventions

- KHÔNG import `@nestjs/passport` hoặc `passport-jwt`
- KHÔNG verify JWT — chỉ sign
- Dùng `@CurrentUser()` (từ `@mynook/shared-types`) để đọc `x-user-id` header
- `register` chỉ cho phép role `user` hoặc `owner` — không cho đăng ký `admin`
