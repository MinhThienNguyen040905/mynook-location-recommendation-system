# CLAUDE.md — search-ai-service

## Overview

NestJS HTTP microservice chạy ở **port 3005**. Xử lý logic tìm kiếm, gợi ý địa điểm, và AI-powered features. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- Tìm kiếm venues theo tags, keywords
- (Planned) AI-powered recommendation engine
- Quản lý tags và search logs

## Key Files

| File | Mô tả |
|------|-------|
| `src/app/app.module.ts` | Root module — import SearchModule |
| `src/app/modules/search/search.module.ts` | Search feature module |
| `src/app/modules/search/search.controller.ts` | REST endpoints cho search |
| `src/app/modules/search/search.service.ts` | Business logic tìm kiếm |

## Database Entities

- `Tag`, `VenueTag`, `SearchLog` (từ `@mynook/database`)

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3005
```

## Conventions

- Khi thêm feature mới (recommendation, AI, etc.), tạo module riêng trong `modules/<feature>/`
