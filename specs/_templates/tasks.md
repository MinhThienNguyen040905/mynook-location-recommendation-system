---
spec: NNN
updated: YYYY-MM-DD
---

# Tasks NNN — <Tên tính năng>

> Mỗi task nhỏ (≤ ~1 giờ), làm được độc lập theo thứ tự, trỏ tới file cụ thể và ghi AC/FR liên quan.
> Ký hiệu: `[ ]` chưa làm · `[x]` xong · `[P]` làm song song được với task liền trước.

## Phase 1 — Nền tảng (DB, shared types)

- [ ] **T1** Migration `NNN_<mo_ta>.sql` — <mô tả> · *FR-1*
- [ ] **T2** Cập nhật entity `libs/database/src/lib/entities/<x>.entity.ts` · *FR-1*
- [ ] **T3** [P] Thêm type/enum vào `libs/shared-types` · *FR-1*

## Phase 2 — Backend service

- [ ] **T4** DTO + service + controller trong `apps/<service>/src/app/modules/<module>/` · *US-1*
- [ ] **T5** Publish/consume event `<routing.key>` · *FR-2*

## Phase 3 — API Gateway

- [ ] **T6** Endpoint proxy + Swagger + guard trong `apps/api-gateway/src/app/modules/<module>/` · *US-1*
- [ ] **T7** [P] Thêm rate limit nếu cần · *NFR-2*

## Phase 4 — Frontend

- [ ] **T8** API client `apps/web-client/src/lib/api/<x>.ts` · *US-1*
- [ ] **T9** UI `apps/web-client/src/...` · *AC-1.1, AC-1.2*

## Phase 5 — Kiểm chứng

- [ ] **T10** Unit test cho <logic> · *AC-...*
- [ ] **T11** Kiểm thử thủ công:
  1. <bước> → kỳ vọng <kết quả> (*AC-1.1*)
- [ ] **T12** `npx nx affected -t lint typecheck build` pass
- [ ] **T13** Cập nhật `spec.md` → `status: done`, đồng bộ lại nếu có lệch
