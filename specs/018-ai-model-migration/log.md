# Log 018 — Chuyển đổi model AI

> Nhật ký sự cố và thay đổi của spec 018. Mỗi mục ghi **trước khi sửa** và cập nhật **sau khi sửa** (thay đổi thực tế, kết quả test). Mới nhất ở trên.

---

## LOG-003 — Gắn tag từ mô tả quán chưa từng hoạt động + vòng lặp hàng đợi thứ hai

| | |
|---|---|
| Ngày phát hiện | 2026-11-25 |
| Phát hiện bởi | `test/ai/venue-pipeline.spec.ts` (AC-3.2) — lượt chạy `npm run test:ai` đầu tiên |
| Mức độ | **Cao** — (1) tính năng không chạy; (2) mỗi quán có mô tả tạo vòng lặp gọi Groq vô hạn |
| Liên quan | spec 018 AC-3.2 · spec [013](../013-ai-tagging/spec.md) US-3 · plan 018 (chưa lường trước) |
| Trạng thái | ⏸️ Chờ người dùng chọn cách sửa — **đã dừng code** theo quy tắc CLAUDE.md §4 |

### Vấn đề

1. `description-tagging.service.ts` ghi điểm sàn `SEED_SCORE_FLOOR = 0.5` vào `search_schema.venue_tags.score` — cột kiểu **integer** → Postgres: `invalid input syntax for type integer: "0.5"`. DB xác nhận **0 dòng** tag từ mô tả từng được tạo → tính năng hỏng từ khi viết, **không liên quan** việc đổi model (Groq vẫn trả tag đúng; lỗi ở bước ghi DB).
2. `description-tagging.controller.ts` gặp lỗi → `nack + requeue` **không giới hạn** (cùng lỗi đã sửa ở review — LOG-001). Vì lỗi (1) xảy ra mọi lần → mỗi quán có mô tả lặp mãi: gọi Groq → lỗi DB → requeue. Trong lần test: 3 lần giao lại trước khi service bị tắt. Hàng đợi hiện sạch (0 message).

### Phương án

| | Cách | Ưu | Nhược |
|---|---|---|---|
| **A (đề xuất)** | Đổi điểm sàn `0.5` → `1` (số nguyên) | Không đổi schema DB dùng chung; vẫn thấp hơn một review xác thực (2) như thiết kế | Tag từ mô tả nặng gấp đôi dự kiến (1 = một review thường) |
| B | Migration đổi `score` sang `numeric(6,2)`, giữ `0.5` | Đúng thiết kế gốc | Đổi schema trên DB nhóm (PRODUCTION); entity, trigger, code cộng điểm review phải rà lại |

Cả hai đều kèm: giới hạn thử lại 3 lần cho controller mô tả (dùng chung cơ chế `settle` với review).

---

## LOG-002 — 266 review có nội dung chưa từng được AI phân tích

| | |
|---|---|
| Ngày phát hiện | 2026-11-25 |
| Phát hiện bởi | Truy vấn DB khi trả lời câu hỏi mở của spec 018 §8 |
| Mức độ | Trung bình — quán thiếu tag từ review → điểm "đặc điểm" trong tìm kiếm yếu |
| Liên quan | spec 018 §8 · spec [013](../013-ai-tagging/spec.md) US-5 (phân tích bù) |
| Trạng thái | ⏸️ Hoãn — không thuộc phạm vi spec 018, chờ quyết định |

### Số liệu (2026-11-25)

| | Số review |
|---|---|
| Tổng | 608 |
| Đã phân tích | 342 |
| **Có nội dung, chưa phân tích** | **266** (44%) |
| — tạo tháng 05/2026 | 265 (chủ yếu review mẫu import Google Maps, vd 8 review "Tiệm bánh KICA" cùng phút 02:40 ngày 22/05) |
| — tạo tháng 09/2026 | 1 (review mẫu quán Demo) |
| Lần phân tích thành công gần nhất | 2026-06-25 |
| Review mới từ khi Groq gỡ Llama | 0 |

### Nguyên nhân (giả thuyết, chưa xác minh)

Review được lưu **trước**, phân tích chạy **ngầm** qua RabbitMQ. Lúc import tháng 05: hoặc RabbitMQ không chạy (sự kiện `venue.reviewed` bị bỏ qua — code chỉ log cảnh báo), hoặc Groq chạm giới hạn. Không phải do sự cố gỡ model lần này.

### Phương án nếu làm

- Ước tính ~2–2,5 nghìn token / review → ~600 nghìn token, vượt hạn mức miễn phí 200 nghìn token / ngày của `gpt-oss-120b` → chạy rải **3–4 ngày**.
- Endpoint sẵn có `POST /reviews/backfill-ai-analysis` (search-ai-service) chạy theo lô, tự dừng và trả `retryAfterSeconds` khi chạm giới hạn.
- Là **script vận hành** trong `tools/` (gọi lặp endpoint theo lô, tôn trọng thời gian chờ) — **không phải** script kiểm thử.
- Điều kiện tiên quyết: LOG-001 xong (model review hoạt động, chống vòng lặp).

---

## LOG-001 — Groq gỡ model Llama, HuggingFace hết hạn mức

| | |
|---|---|
| Ngày phát hiện | 2026-11-25 (khi chạy hệ thống local) |
| Mức độ | **Cao** — hỏng hiểu câu tìm kiếm, vector ngữ nghĩa, gắn tag, đọc menu; nguy cơ vòng lặp gọi AI |
| Liên quan | spec 018 toàn bộ · spec 006, 011, 012, 013 |
| Trạng thái | 🟡 Đang sửa — spec/plan duyệt 2026-11-25 |

### Vấn đề (đã xác minh bằng gọi thử)

- Groq `GET /models` với khoá hiện tại: 200, 11 model, **không còn Llama**. `llama-4-scout-17b-16e-instruct` → 404.
- HuggingFace `featureExtraction`: "Purchase pre-paid credits to continue using Inference Providers".
- `qwen/qwen3.8-27b` đọc được ảnh menu thật nhưng: JSON bị cắt (giới hạn 1.000 token đầu ra / phút gói miễn phí), giá "62" không quy đổi nghìn đồng.

### Kế hoạch

Theo [plan.md](plan.md) / [tasks.md](tasks.md): chặn vòng lặp review → vector chạy cục bộ (`@huggingface/transformers`, cùng model) → đổi model Groq qua biến môi trường → sửa đọc menu → kiểm thử bằng script trong `test/ai/`.

### Tiêu chí hoàn thành

`npm run test:ai` pass (gồm nhóm `@groq`), `npm run e2e` 35/35.

### Đã thực hiện tới 2026-11-25 (T1–T10)

| Task | Thay đổi |
|---|---|
| T1 | `review-processing.controller.ts`: `ReviewAnalysisFailedError` → ack + log; lỗi khác thử lại tối đa 3 lần (hàm `settle`). **Lệch plan:** đếm số lần thử **trong bộ nhớ** theo review, không qua header `x-retry-count` — RabbitMQ không cho sửa header khi nack + requeue |
| T2 | `specs/stack.md`: model mới, embedding cục bộ, 2 dòng quyết định công nghệ |
| T3 | Cài `@huggingface/transformers` 4.3.2 (+ `onnxruntime-node` 1.30.0). Chạy được Windows / Node 24; **cosine = 1,00000** với 5 vector cũ; ~10 ms / vector; nạp model ~6 s lần đầu, ~0,4 s khi có cache |
| T4 | Lib mới `libs/embedding` (`LocalEmbedder`, `localEmbedder`, `toPgVector`), đăng ký vào tsconfig gốc, 2 app, npm workspace |
| T6 | `EmbeddingService` (search-ai) và `VenueEmbeddingService` (venue) dùng `localEmbedder`; bỏ `HfInference` |
| T7 | 3 service Groq: model từ `GROQ_QUERY_MODEL` / `GROQ_DESCRIPTION_MODEL` / `GROQ_REVIEW_MODEL`, `reasoning_effort: 'low'`, `max_tokens` 1200 / 1000 / 1500, log model khi khởi động |
| T9 | `menu-analyze.service.ts`: `qwen/qwen3.8-27b`, JSON một dòng, `max_tokens` 1000, `normalizeVndPrice` (×1000, hiểu "45k"), cắt cụt / 429 → "Menu quá dài — hãy chụp từng phần". **Ngoài plan, bắt buộc:** gateway `menu.controller.ts` trước đây biến mọi lỗi venue-service thành 500 → thêm chuyển nguyên mã lỗi + thông báo; web-client 2 component hiển thị câu này (`menuAnalyzeErrorMessage`) |
| T10 | `.env.example`: 4 biến model; ghi chú `HUGGINGFACE_API_TOKEN` không còn dùng |
| T5, T5b, T8, T11–T13 | `test/playwright.ai.config.ts`, `test/ai/run.mjs` (2 lượt), `test/support/{rmq,ai-db,ai-api,ai-teardown}.ts`, 5 file test + fixture trong `test/ai/` |

Typecheck: search-ai-service, venue-service, api-gateway (+ 6 lib), web-client, bộ test — đều 0 lỗi.

### Kết quả `npm run test:ai` lần 1 (2026-11-25)

| Test | Kết quả |
|---|---|
| AC-2.3 vector cục bộ ↔ vector cũ (5 quán) | ✅ |
| AC-2.3 embedBatch = embed | ✅ |
| AC-4.1 + 4.2 menu ngắn (8 món, giá ×1000) | ✅ 2,1 s |
| AC-4.3 menu dài THÔ'S | ✅ |
| AC-3.1 review được `gpt-oss-120b` phân tích, tag tăng | ✅ 11,6 s |
| AC-1.1 / 1.2 / 2.1 tìm kiếm 10 câu | ✅ **hiểu đúng 10/10**, semantic > 0 10/10, **p90 1,36 s** (trước: "cafe yen tinh" → 0 kết quả) |
| AC-2.2 + 3.2 quán mới có vector + tag mô tả | ❌ vector OK, **tag mô tả = 0** → LOG-003 |
| AC-3.3 model sai → không lặp hàng đợi (lượt 2) | ✅ redeliver = 0, review còn, chưa phân tích |

**7 / 8 đạt.** Chưa chạy lại `npm run e2e` (chờ xử lý LOG-003).

### Phát hiện phụ (ngoài phạm vi — spec 011)

Bộ tách số người / khung giờ chỉ hiểu tiếng Việt **có dấu**: "cafe yen tinh thu duc cho 4 nguoi buoi toi" → `capacity = null`, `timeContext = null` (AI vẫn hiểu loại quán, tag, khu vực).
