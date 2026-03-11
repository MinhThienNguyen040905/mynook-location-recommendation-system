# MyNook — Location Recommendation System

Hệ thống Đánh giá & Khám phá địa điểm, xây dựng trên kiến trúc **Strict Microservices** với Nx Monorepo.

## Tech Stack

| Layer           | Technology               |
| --------------- | ------------------------ |
| Monorepo        | Nx 22.5 (npm workspaces) |
| Frontend        | Next.js 16 (App Router)  |
| API Gateway     | NestJS (HTTP REST)       |
| Microservices   | NestJS (TCP / RabbitMQ)  |
| Package Manager | npm                      |

## Cấu trúc dự án

```
├── apps/
│   ├── web-client/            # Frontend Next.js        (port 3000 dev)
│   ├── api-gateway/           # REST API Gateway         (port 3000)
│   ├── auth-service/          # Microservice xác thực    (TCP 3001)
│   ├── venue-service/         # Microservice địa điểm    (TCP 3002)
│   ├── interaction-service/   # Microservice tương tác   (TCP 3003)
│   └── search-ai-service/     # Microservice tìm kiếm AI (TCP 3004)
│
├── libs/
│   ├── shared-types/          # Enums, Interfaces dùng chung (FE + BE)
│   ├── database/              # Cấu hình DB, schemas
│   └── rmq-messaging/         # RabbitMQ client/server module
```

## Yêu cầu hệ thống

- **Node.js** >= 20
- **npm** >= 10
- **RabbitMQ** (cho production, dev dùng TCP transport)

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd mynook-location-recommendation-system

# Cài dependencies
npm install
```

## Chạy dự án

### Khởi động tất cả apps cùng lúc

```bash
npx nx run-many -t serve
```

### Khởi động từng app riêng lẻ

```bash
# API Gateway (HTTP :3000)
npx nx serve api-gateway

# Frontend (Next.js dev server)
npx nx dev web-client

# Microservices
npx nx serve auth-service
npx nx serve venue-service
npx nx serve interaction-service
npx nx serve search-ai-service
```

### Chỉ khởi động backend (không có frontend)

```bash
npx nx run-many -t serve --projects=api-gateway,auth-service,venue-service,interaction-service,search-ai-service
```

## Cài đặt Package

> **Quy tắc vàng:** Trong Nx monorepo, **LUÔN cài package từ thư mục root**. Không bao giờ `cd` vào từng app để cài.
>
> Nx monorepo chỉ có **1 `package.json`** và **1 `node_modules/`** ở root. Tất cả apps/libs dùng chung. App nào cần thì `import`, app không import sẽ không bị ảnh hưởng (tree-shaking khi build).

### Cú pháp cơ bản

```bash
# Cài package runtime (dependencies)
npm install <package-name>

# Cài package chỉ dùng lúc dev (devDependencies)
npm install -D <package-name>

# Chạy CLI tool 1 lần (không cài vào project)
npx <package-name>

# Xóa package
npm uninstall <package-name>
```

### Package gợi ý cho Backend (NestJS)

```bash
# Database (PostgreSQL + TypeORM)
npm install typeorm @nestjs/typeorm pg

# Validation (DTO validation cho request body)
npm install class-validator class-transformer

# Authentication (JWT)
npm install @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt

# Environment variables (.env)
npm install @nestjs/config
```

### Package gợi ý cho Frontend (Next.js)

```bash
# UI Components — shadcn/ui
# Lưu ý: dùng --cwd để trỏ vào đúng app frontend
npx shadcn@latest init --cwd apps/web-client
npx shadcn@latest add button --cwd apps/web-client
npx shadcn@latest add card input --cwd apps/web-client

# State management
npm install zustand

# HTTP client (gọi API từ frontend)
npm install axios

# Form handling + validation
npm install react-hook-form zod @hookform/resolvers
```

### Package cho RabbitMQ (chỉ cần khi lên production)

```bash
npm install amqplib amqp-connection-manager
npm install -D @types/amqplib
```

### Tóm tắt nhanh

| Muốn làm gì | Lệnh | Ví dụ |
| --- | --- | --- |
| Cài package dùng trong code | `npm install <pkg>` | `npm install axios` |
| Cài tool chỉ dùng lúc dev | `npm install -D <pkg>` | `npm install -D @types/node` |
| Chạy CLI tool 1 lần | `npx <pkg>` | `npx shadcn@latest add button --cwd apps/web-client` |
| Xóa package không dùng nữa | `npm uninstall <pkg>` | `npm uninstall axios` |
| Cài package cho FE (shadcn) | `npx shadcn@latest add <comp> --cwd apps/web-client` | `npx shadcn@latest add dialog --cwd apps/web-client` |

## Build

```bash
# Build tất cả
npx nx run-many -t build

# Build một app cụ thể
npx nx build api-gateway
npx nx build web-client
```

## Kiến trúc

```
[Client] → [web-client :4200]
                 ↓ HTTP
           [api-gateway :3000]  ← REST API duy nhất expose ra ngoài
            ↙    ↓    ↘    ↘
     TCP  TCP  TCP   TCP
        ↙      ↓      ↘      ↘
[auth]    [venue]  [interaction] [search-ai]
:3001     :3002      :3003        :3004
```

- **api-gateway** là điểm vào duy nhất, nhận HTTP request và chuyển tiếp tới các microservice qua TCP.
- Các microservice **không** expose HTTP endpoint, chỉ lắng nghe TCP message patterns.
- Trong production, giao tiếp nội bộ chuyển sang **RabbitMQ** thông qua `@mynook/rmq-messaging`.

## Shared Libraries

| Library       | Import                  | Mô tả                                                                                                              |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| shared-types  | `@mynook/shared-types`  | Enums (`UserRole`, `VenueCategory`, `BookingStatus`), Interfaces (`IUser`, `IVenue`, `IReview`), Service constants |
| database      | `@mynook/database`      | Cấu hình kết nối DB, entity schemas                                                                                |
| rmq-messaging | `@mynook/rmq-messaging` | `RmqModule.register()` cho RabbitMQ client/server                                                                  |

## Các lệnh Nx hữu ích

```bash
# Xem dependency graph
npx nx graph

# Liệt kê tất cả projects
npx nx show projects

# Chạy lint
npx nx run-many -t lint

# Chạy typecheck
npx nx run-many -t typecheck

# Chỉ chạy các project bị ảnh hưởng bởi thay đổi
npx nx affected -t build
npx nx affected -t serve
```

## Cổng (Ports)

| Service             | Port       | Transport |
| ------------------- | ---------- | --------- |
| web-client          | 3000 (dev) | HTTP      |
| api-gateway         | 3000       | HTTP REST |
| auth-service        | 3001       | TCP       |
| venue-service       | 3002       | TCP       |
| interaction-service | 3003       | TCP       |
| search-ai-service   | 3004       | TCP       |

> **Lưu ý:** web-client (Next.js) và api-gateway cùng port 3000 mặc định. Khi chạy đồng thời, Next.js sẽ tự tìm port trống tiếp theo (3005+). Hoặc cấu hình lại port Next.js dev server trong `apps/web-client/next.config.ts`.

## License

MIT
