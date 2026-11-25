# CLAUDE.md

MyNook — hệ thống khám phá & đánh giá địa điểm. Nx monorepo: NestJS microservices + Next.js. Tổng quan kiến trúc xem [README.md](README.md), thuật toán search/recommend xem [docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md](docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md).

## Dự án này theo Spec-Driven Development

**Đọc [specs/constitution.md](specs/constitution.md) trước khi thiết kế hoặc viết code.** Quy trình đầy đủ và danh mục spec ở [specs/README.md](specs/README.md).

Tài liệu cấp dự án (đọc khi liên quan): [mission.md](specs/mission.md) (mục tiêu sản phẩm), [stack.md](specs/stack.md) (công nghệ — không thêm thư viện mới nếu chưa ghi vào đây), [ux-ui.md](specs/ux-ui.md) (bắt buộc khi làm giao diện), [lotrinh.md](specs/lotrinh.md) (cập nhật khi spec đổi trạng thái).

Spec có `implementation: done` là baseline của code đã có: khi điền, mô tả đúng hành vi hiện tại, không thiết kế lại.

Khi được yêu cầu làm một tính năng mới hoặc thay đổi hành vi:

1. Kiểm tra trong `specs/` đã có spec liên quan chưa.
   - Có → đọc `spec.md`, `plan.md`, `tasks.md` và làm theo; không tự mở rộng phạm vi ngoài spec.
   - Chưa có → **không code ngay**. Đề xuất tạo spec (`/spec`) và dừng lại chờ người dùng duyệt.
2. Thứ tự bắt buộc: `spec.md` (approved) → `plan.md` (approved) → `tasks.md` → code. Không nhảy bước trừ khi người dùng yêu cầu rõ.
3. Khi implement: làm theo thứ tự task, tick `[x]` trong `tasks.md` sau mỗi task hoàn thành.
4. Nếu trong lúc code phát hiện spec/plan sai hoặc thiếu → dừng, báo người dùng, cập nhật spec/plan trước khi code tiếp.
5. Ngoại lệ không cần spec: sửa bug nhỏ không đổi hành vi đã đặc tả, refactor nội bộ, chỉnh UI nhỏ, cập nhật dependency.

## Lệnh thường dùng

```bash
npm run infra:up                         # Redis + RabbitMQ (Docker)
npx nx run-many -t serve                 # chạy tất cả app
npx nx serve <app>                       # chạy 1 app
npx nx affected -t lint typecheck build  # kiểm tra trước khi đóng spec
```

## Ghi nhớ nhanh

- Cài package luôn ở root (`npm install <pkg>`), không cd vào app.
- Thay đổi DB = migration SQL mới, đánh số tiếp theo trong `libs/database/src/lib/migrations/`.
- Mỗi schema DB chỉ do service owner ghi (xem constitution mục II.2).
- Endpoint public phải đi qua `apps/api-gateway`.
