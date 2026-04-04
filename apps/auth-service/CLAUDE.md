# CLAUDE.md — auth-service

## Overview

NestJS HTTP microservice chạy ở **port 3002**. Xử lý toàn bộ logic xác thực và quản lý người dùng. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Ký JWT (sign) khi login/register — KHÔNG verify request JWT (chỉ api-gateway mới verify)
- Lưu trữ accounts trong PostgreSQL schema `auth_schema`
- Nhận thông tin account từ `x-user-id` / `x-user-type` headers (forward từ api-gateway) via `@CurrentUser()` decorator

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/register` | Public | Đăng ký (customer/business) |
| POST | `/auth/login` | Public | Đăng nhập → trả tokens + account info |
| POST | `/auth/refresh` | Public | Làm mới access_token |
| GET | `/auth/profile` | x-user-id header | Lấy profile |
| POST | `/auth/forgot-password` | Public | Tạo reset token (dev: trả trong response) |
| POST | `/auth/reset-password` | Public | Đặt lại mật khẩu bằng token |
| POST | `/auth/change-password` | x-user-id header | Đổi mật khẩu (cần mật khẩu cũ) |
| PATCH | `/auth/profile` | x-user-id header | Cập nhật tên, SĐT, avatar |

## DTOs

| File | Dùng cho |
|------|----------|
| `register.dto.ts` | email, password, full_name?, phone_number?, type? (customer\|business) |
| `login.dto.ts` | email, password |
| `refresh-token.dto.ts` | refresh_token |
| `forgot-password.dto.ts` | email |
| `reset-password.dto.ts` | token, new_password |
| `change-password.dto.ts` | old_password, new_password |
| `update-profile.dto.ts` | full_name?, phone_number?, avatar_url? |

## Account Entity — Database columns

Schema: `auth_schema`, Table: `accounts`

| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid | PK |
| email | varchar(255) | unique |
| password_hash | varchar(255) | nullable (OAuth accounts) |
| full_name | varchar(100) | nullable |
| avatar_url | text | nullable |
| phone_number | varchar(20) | nullable |
| type | enum | customer/business/admin, default: customer |
| trust_score | int | default: 100 |
| is_active | boolean | default: true |
| password_reset_token | varchar(255) | nullable — SHA-256 hash của raw token |
| password_reset_expires | timestamptz | nullable — hết hạn sau 1 giờ |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### SQL Migration — tạo bảng accounts

```sql
CREATE TABLE IF NOT EXISTS auth_schema.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(100),
  avatar_url TEXT,
  phone_number VARCHAR(20),
  type VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'business', 'admin')),
  trust_score INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
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
- `register` chỉ cho phép type `customer` hoặc `business` — không cho đăng ký `admin`
- JWT payload chứa `{ sub, email, type }` — KHÔNG dùng `role`
