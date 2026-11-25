---
spec: '018'
status: approved
updated: 2026-11-25
---

# Plan 018 — Chuyển đổi model AI

## 1. Tóm tắt giải pháp

### 1.1 Model sinh văn bản / đọc ảnh — Groq (gói miễn phí)

| Chức năng | Model cũ (đã gỡ) | Model mới | Biến môi trường mới |
|---|---|---|---|
| Hiểu câu tìm kiếm | `llama-3.1-8b-instant` | `openai/gpt-oss-20b` | `GROQ_QUERY_MODEL` |
| Gắn tag từ mô tả quán | `llama-3.1-8b-instant` | `openai/gpt-oss-20b` | `GROQ_DESCRIPTION_MODEL` |
| Phân tích review | `llama-3.3-70b-versatile` | `openai/gpt-oss-120b` | `GROQ_REVIEW_MODEL` |
| Đọc ảnh menu | `llama-4-scout-17b-16e-instruct` | `qwen/qwen3.8-27b` | `GROQ_VISION_MODEL` (đã có) |

**Lưu ý kỹ thuật `gpt-oss`:** là model *suy luận* — sinh "token suy nghĩ" trước câu trả lời, tính vào `max_tokens` và hạn mức token/phút. Vì vậy:
- Đặt `reasoning_effort: 'low'` (tham số Groq hỗ trợ cho gpt-oss) để nhanh và tiết kiệm token.
- Nâng `max_tokens`: tìm kiếm 400 → 1.200; mô tả 300 → 1.000; review 512 → 1.500 (tránh cắt cụt JSON).
- Giữ `response_format: json_object` (gpt-oss hỗ trợ).
- Giữ timeout 3,5 s / 4 s; đo lại ở T8, chỉnh nếu vượt AC-1.2.

### 1.2 Vector ngữ nghĩa — `gpt-oss` **không** sinh được vector

`gpt-oss-*` là model sinh văn bản. Vector 384 chiều phải do model **embedding**; danh sách model Groq không có model embedding nào. Ba lựa chọn:

| | Cách | Tương thích 137 vector cũ | Chi phí | Nhược |
|---|---|---|---|---|
| **C ✅ khuyến nghị** | Chạy chính `all-MiniLM-L6-v2` **trong service** bằng thư viện `@huggingface/transformers` (bản ONNX `Xenova/all-MiniLM-L6-v2`, mean pooling + chuẩn hoá — giống cách sentence-transformers sinh vector cũ) | ✅ cùng model → kiểm chứng bằng AC-2.3 | Miễn phí, không giới hạn | Thư viện mới (~ tải model 23 MB lần đầu, +100 MB RAM mỗi service); phải ghi vào `stack.md` |
| A | Token HuggingFace khác | ✅ | Miễn phí tới khi hết hạn mức | Hỏng lại |
| B | Nạp credit HuggingFace | ✅ | Trả phí | — |

Chọn **C** — dùng chung một lớp `LocalEmbedder` trong lib mới `libs/embedding` (venue-service và search-ai-service đang có hai bản `EmbeddingService` gần giống nhau → gộp lại, giữ cơ chế thử lại hiện có của venue-service).

### 1.3 Chặn vòng lặp khi AI lỗi (bắt buộc trước khi bật lại phân tích review)

`review-processing.controller.ts`: khi `processReview` ném `ReviewAnalysisFailedError` (AI lỗi / vượt hạn mức) → **ack** (bỏ qua), log cảnh báo, review giữ `ai_analysis_json = NULL` để phân tích bù sau bằng endpoint backfill sẵn có. Chỉ **nack + requeue** với lỗi cơ sở dữ liệu tạm thời, tối đa 3 lần (đếm qua header `x-retry-count` khi publish lại), quá 3 lần thì ack + log lỗi.

### 1.4 Đọc ảnh menu (phương án A đã chốt)

`menu-analyze.service.ts`:
- Model mặc định `qwen/qwen3.8-27b`.
- Prompt: yêu cầu JSON **một dòng, không thụt lề** (giảm ~½ token đầu ra — vượt 1.000 token/phút là nguyên nhân cắt cụt khi thử); thêm quy tắc "giá viết tắt nghìn đồng (vd 62, 45k) → nhân 1.000".
- Hậu xử lý: giá `0 < p < 1000` → `p × 1000`; bỏ khối `<think>…</think>` nếu có.
- Lỗi: JSON không hoàn chỉnh hoặc HTTP 429 → `BadRequestException('Menu quá dài — hãy chụp từng phần')`; giao diện hiển thị nguyên câu từ backend.

## 2. Constitution Check

| Nguyên tắc | | Ghi chú |
|---|---|---|
| II.2 Chỉ owner ghi schema | ✅ | Không đổi |
| IV.1 Sanitize đầu ra AI | ✅ | Giữ nguyên lớp `sanitize` / `validateAnalysis` hiện có |
| IV.2 Timeout + fallback | ✅ | Giữ; bổ sung chống vòng lặp (§1.3) |
| IV.3 Secret chỉ ở backend | ✅ | Bỏ `HUGGINGFACE_API_TOKEN` khỏi yêu cầu bắt buộc |
| III Migration | N/A | Không đổi schema (cùng 384 chiều) |
| stack.md | ⚠️ | Thêm `@huggingface/transformers` + model Groq mới → **cập nhật `stack.md` trước khi cài** |

## 3. Service bị ảnh hưởng

| App / lib | Thay đổi |
|---|---|
| `libs/embedding` (mới) | `LocalEmbedder`: tải model lần đầu, `embed(text)`, `embedBatch(texts)`, trả 384 chiều đã chuẩn hoá |
| search-ai-service | `EmbeddingService` dùng `LocalEmbedder`; 3 service Groq đọc model từ env + `reasoning_effort`; controller review chống vòng lặp |
| venue-service | `VenueEmbeddingService` dùng `LocalEmbedder`; `menu-analyze.service.ts` theo §1.4 |
| web-client | Trang menu hiển thị thông báo lỗi từ backend (nếu đang hiện câu cứng) |
| `.env.example`, `stack.md` | Biến model mới; ghi chú `HUGGINGFACE_API_TOKEN` không còn bắt buộc |

## 4. Mô hình dữ liệu

Không đổi. Vector vẫn `vector(384)`.

## 5. API contract

Không đổi endpoint. `POST /venues/:id/menu/analyze-image` thêm thông báo lỗi 400 "Menu quá dài — hãy chụp từng phần".

## 6. Event (RabbitMQ)

`venue.reviewed`: thay đổi cách xử lý lỗi (§1.3). Không đổi payload.

## 7. Frontend

Chỉ thông báo lỗi đọc menu (nếu cần).

## 8. Xử lý lỗi & fallback

| Tình huống | Hành vi |
|---|---|
| Groq 429 / timeout khi tìm kiếm | Dự phòng như cũ |
| Groq lỗi khi phân tích review | Ack, review chưa có phân tích → backfill sau |
| Tải model embedding lần đầu thất bại (mất mạng) | Log lỗi, tìm kiếm chạy không vector, thử tải lại ở lần gọi kế |
| Menu dài / 429 | Thông báo chụp từng phần |

## 9. Kiểm thử

> **Mọi kiểm thử là script lưu trong `test/`** (yêu cầu người dùng 2026-11-25), chạy lại được, không kiểm tay.

### 9.1 Cấu trúc

```
test/
├── playwright.config.ts          # bộ auth hiện có (giữ nguyên)
├── playwright.ai.config.ts       # MỚI — bộ AI: khởi động / dùng lại đủ 5 backend + RabbitMQ, không cần trình duyệt
├── e2e/auth/…                    # hiện có
├── ai/                           # MỚI
│   ├── embedding-compat.spec.ts  # AC-2.3
│   ├── search-understanding.spec.ts   # AC-1.1, 1.2, 2.1
│   ├── venue-pipeline.spec.ts    # AC-2.2, 3.2
│   ├── review-analysis.spec.ts   # AC-3.1, 3.3
│   ├── menu-vision.spec.ts       # AC-4.1–4.3
│   └── fixtures/
│       ├── search-queries.json   # 10 câu mẫu + kỳ vọng (loại quán, khu vực, số người…)
│       └── menus/                # ảnh menu ngắn + dài (lưu cục bộ, upload khi chạy)
└── support/
    ├── db.ts                     # mở rộng: tạo / dọn quán & review test (tên bắt đầu "E2E-AI ")
    └── rmq.ts                    # MỚI — đọc số message trong hàng đợi qua RabbitMQ management API
```

Script: `npm run test:ai` (+ `-- --grep @groq` cho nhóm tốn hạn mức Groq).

### 9.2 Bảng kiểm thử

| AC | Script | Cách kiểm chứng |
|---|---|---|
| AC-2.3 | `ai/embedding-compat.spec.ts` | Lấy 5 quán có vector cũ, sinh lại từ `search_document` bằng `LocalEmbedder` → cosine ≥ 0,99. **Không gọi mạng, không tốn hạn mức** |
| AC-1.1, 1.2, 2.1 | `ai/search-understanding.spec.ts` `@groq` | 10 câu mẫu qua `/api/search/public?debug=1`: `strategy ≠ unclear`, trích đúng loại quán / số người / khu vực theo fixture; `semantic > 0`; p90 thời gian ≤ 3,5 s |
| AC-2.2, 3.2 | `ai/venue-pipeline.spec.ts` `@groq` | Tạo quán test có mô tả → chờ ≤ 30 s: có `embedding`; có `venue_tags` từ mô tả |
| AC-3.1 | `ai/review-analysis.spec.ts` `@groq` | Viết review test → chờ: `ai_analysis_json` có dữ liệu, `venue_tags` tăng |
| AC-3.3 | `ai/review-analysis.spec.ts` | Khởi động search-ai-service với `GROQ_REVIEW_MODEL=model-khong-ton-tai` → viết review → sau 10 s hàng đợi `search_ai_queue` = 0, không có message chưa ack, review vẫn tồn tại |
| AC-4.1–4.3 | `ai/menu-vision.spec.ts` `@groq` | Ảnh ngắn → JSON hợp lệ, giá ≥ 1.000; ảnh dài → hoặc đủ món hoặc lỗi "Menu quá dài — hãy chụp từng phần" (không lỗi chung) |
| AC-5.1, 5.2 | `ai/search-understanding.spec.ts` | Log khởi động (đọc stdout webServer) liệt kê model cho từng chức năng |
| Hồi quy | `npm run e2e` | Bộ auth vẫn 35/35 |

Dữ liệu test (quán, review, tài khoản) tạo trên database nhóm được global teardown dọn; quán test đặt tên `E2E-AI …` để helper chỉ xoá đúng phạm vi.

**Hạn mức Groq khi chạy test:** một lượt `@groq` ước tính ~15 lời gọi (~40–60 nghìn token) → chạy được ~3 lần / ngày trên gói miễn phí. Nhóm không `@groq` chạy thoải mái.

## 10. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| `gpt-oss-20b` hiểu tiếng Việt kém hơn Llama | Đo bằng 10 câu mẫu (T8); nếu kém → thử `gpt-oss-120b` / `qwen/qwen3.8-27b` chỉ bằng đổi `.env` |
| Vector từ bản ONNX lệch vector cũ | AC-2.3 phát hiện; nếu lệch → chạy `reindex-embeddings?force=true` (138 quán, chạy cục bộ nên miễn phí) |
| Hạn mức 8.000 token/phút bị chạm khi demo | Cache câu tìm kiếm 60 phút sẵn có; dự phòng không lỗi |
| `qwen/qwen3.8-27b` (Preview) bị gỡ | Đổi qua `GROQ_VISION_MODEL` |
| `onnxruntime-node` cần bản build sẵn cho Windows / Node 24 | Kiểm tra ngay ở T3 trước khi làm tiếp |
