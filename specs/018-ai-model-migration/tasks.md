---
spec: '018'
updated: 2026-11-25
---

# Tasks 018 — Chuyển đổi model AI

> Chỉ bắt đầu khi [spec.md](spec.md) và [plan.md](plan.md) ở `approved`. Ghi [log.md](log.md) trước khi sửa, cập nhật kết quả sau khi test.

## Phase 0 — Chặn rủi ro ngay

- [x] **T1** `review-processing.controller.ts`: AI lỗi → ack + log; chỉ requeue lỗi DB tối đa 3 lần · *AC-3.3*
- [x] **T2** Cập nhật [stack.md](../stack.md): model Groq mới, `@huggingface/transformers`, ghi chú HuggingFace API không còn dùng

## Phase 1 — Vector chạy cục bộ

- [x] **T3** `npm install @huggingface/transformers`; script thử nhỏ chạy được trên Windows / Node 24 (kiểm `onnxruntime-node`) — **dừng và báo nếu không chạy**
- [x] **T4** Tạo `libs/embedding`: `LocalEmbedder` (lazy load, mean pooling + normalize, 384 chiều)
- [x] **T5** `test/playwright.ai.config.ts` + `test/support/rmq.ts` + mở rộng `test/support/db.ts`; script `npm run test:ai`
- [x] **T5b** `test/ai/embedding-compat.spec.ts`: 5 quán, cosine(vector mới, vector cũ) ≥ 0,99 · *AC-2.3* — **chạy ngay sau T4, dừng nếu không đạt**
- [x] **T6** `search-ai-service/.../embedding.service.ts` và `venue-service/.../embedding.service.ts` dùng `LocalEmbedder` · *AC-2.1, 2.2, 2.4*

## Phase 2 — Model Groq

- [x] **T7** `query-extraction.service.ts`, `description-groq.service.ts`, `groq-ai.service.ts`: model từ env (`GROQ_QUERY_MODEL`, `GROQ_DESCRIPTION_MODEL`, `GROQ_REVIEW_MODEL`), `reasoning_effort: 'low'`, nâng `max_tokens`, log model khi khởi động · *FR-1, FR-2, AC-5.1, 5.2*
- [x] **T8** `test/ai/fixtures/search-queries.json` (10 câu + kỳ vọng) và `test/ai/search-understanding.spec.ts` · *AC-1.1, 1.2, 2.1, 5.2*
- [x] **T9** `menu-analyze.service.ts`: model mặc định qwen, JSON một dòng, quy tắc giá, hậu xử lý ×1000, lỗi "Menu quá dài" · *AC-4.1–4.3*
- [x] **T10** [P] `.env.example`: các biến model mới; `HUGGINGFACE_API_TOKEN` → tuỳ chọn

## Phase 3 — Kiểm chứng (toàn bộ là script trong `test/ai/`)

- [x] **T11** `test/ai/venue-pipeline.spec.ts` + `test/ai/review-analysis.spec.ts` (AC-3.1) — dọn dữ liệu trong teardown · *AC-2.2, 3.1, 3.2*
- [x] **T12** `test/ai/review-analysis.spec.ts` — ca model sai → hàng đợi về 0, không lặp · *AC-3.3*
- [x] **T13** `test/ai/menu-vision.spec.ts` + 2 ảnh trong `test/ai/fixtures/menus/` · *AC-4.1–4.3*
- [ ] **T14** *(test:ai 7/8 — chờ T16)* `npm run test:ai` pass; `npm run e2e` 35/35; `nx typecheck` search-ai-service, venue-service
## Phase 4 — Bổ sung do test phát hiện (LOG-003, chờ người dùng chọn A / B)

- [ ] **T16** Sửa ghi điểm tag từ mô tả: A — điểm sàn `0.5 → 1`; hoặc B — migration `venue_tags.score` → `numeric(6,2)` · *AC-3.2*
- [ ] **T17** `description-tagging.controller.ts`: giới hạn thử lại 3 lần (dùng chung cơ chế `settle`) · *AC-3.3 mở rộng*
- [ ] **T18** Test: `venue-pipeline.spec.ts` pass; thêm ca mô tả + lỗi DB không lặp (nếu khả thi)

- [ ] **T15** Ghi log.md; cập nhật spec 018 → done; ghi chú vào §9 của spec 006, 011, 012, 013; [lotrinh.md](../lotrinh.md), [specs/README.md](../README.md)
