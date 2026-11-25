---
id: '018'
title: Chuyển đổi model AI (Groq gỡ Llama, HuggingFace hết hạn mức)
status: in-progress
implementation: partial
owner: <người phụ trách>
created: 2026-11-25
updated: 2026-11-25
services: [search-ai-service, venue-service]
code:
  - apps/search-ai-service/src/app/modules/search/query-extraction.service.ts
  - apps/search-ai-service/src/app/modules/search/embedding.service.ts
  - apps/search-ai-service/src/app/modules/description-tagging/description-groq.service.ts
  - apps/search-ai-service/src/app/modules/review-processing
  - apps/venue-service/src/app/modules/venue/embedding.service.ts
  - apps/venue-service/src/app/modules/menu/menu-analyze.service.ts
---

# Spec 018 — Chuyển đổi model AI

> Spec sửa lỗi liên feature: khôi phục các tính năng AI của [006](../006-menu-management/spec.md), [011](../011-hybrid-search/spec.md), [012](../012-recommendation/spec.md), [013](../013-ai-tagging/spec.md) sau khi nhà cung cấp thay đổi. Không thêm tính năng mới.

## 1. Bối cảnh & vấn đề

Ngày 2026-11-25, khi chạy hệ thống, xác nhận bằng gọi thử thật:

| Nhà cung cấp | Thay đổi | Tính năng hỏng |
|---|---|---|
| Groq | Gỡ toàn bộ model Llama khỏi tài khoản (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `llama-4-scout-17b-16e-instruct` → 404). Còn: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b` (đọc được ảnh), `whisper-*` | Hiểu câu tìm kiếm (011), gắn tag từ mô tả và từ review (013), đọc ảnh menu (006) |
| HuggingFace | Hết hạn mức miễn phí ("Purchase pre-paid credits") | Sinh vector ngữ nghĩa cho câu tìm kiếm (011) và cho quán mới / vừa sửa (011, 012) |

Hệ quả phụ nguy hiểm: phân tích review lỗi → sự kiện bị đưa lại hàng đợi ngay, không giới hạn ([013](../013-ai-tagging/spec.md) §9) → vòng lặp gọi AI liên tục khi có review mới.

## 2. Mục tiêu

- Mọi tính năng AI ở trên hoạt động lại, **dùng gói miễn phí**.
- Vector mới **tương thích** với 137 vector quán đã lưu (không phải tính lại toàn bộ).
- Lần sau nhà cung cấp gỡ model: đổi được bằng biến môi trường, không sửa code.
- Vượt hạn mức / AI lỗi không gây vòng lặp và không làm hỏng tính năng chính.

### Ngoài phạm vi

- Đổi model embedding sang model khác `all-MiniLM-L6-v2` (sẽ phải tính lại toàn bộ vector).
- Cải thiện thuật toán tìm kiếm / chế độ dự phòng (để spec riêng).
- Chuyển nhận dạng giọng nói (`whisper-large-v3` vẫn còn) và file `lib/gemini.ts` không dùng ở web-client.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Khách | Tìm kiếm hiểu câu tự nhiên trở lại; quán mới xuất hiện trong gợi ý |
| Chủ quán / người đóng góp | Nhập menu từ ảnh hoạt động; menu dài có hướng dẫn rõ |
| Vận hành (nhóm phát triển) | Không bị vòng lặp AI; đổi model qua `.env` |

## 4. User stories

### US-1: Tìm kiếm hiểu câu tự nhiên trở lại (P1)

- [ ] **AC-1.1** — *Given* hệ thống chạy với khoá Groq hiện tại, *When* tìm "quán cà phê yên tĩnh quận 1 cho 4 người buổi tối", *Then* câu được phân tích thành loại quán, đặc điểm, khu vực, số người, khung giờ (không rơi vào chế độ dự phòng).
- [ ] **AC-1.2** — Thời gian phân tích câu ≤ 3,5 giây trong ≥ 90% lượt; quá hạn thì dùng dự phòng như cũ.

### US-2: Vector ngữ nghĩa hoạt động trở lại (P1)

- [ ] **AC-2.1** — Câu tìm kiếm có vector; điểm ngữ nghĩa đóng góp vào xếp hạng.
- [ ] **AC-2.2** — Quán tạo mới / sửa mô tả có vector trong vòng 30 giây, xuất hiện trong gợi ý cá nhân hoá.
- [ ] **AC-2.3** — Vector mới tương thích vector cũ: với cùng một văn bản, độ tương đồng cosine giữa vector mới và vector đã lưu ≥ 0,99.
- [ ] **AC-2.4** — Không phụ thuộc hạn mức của dịch vụ bên ngoài cho việc sinh vector.

### US-3: Gắn tag tự động trở lại (P1)

- [ ] **AC-3.1** — Review mới có nội dung được phân tích thành tag và lưu kết quả lên review.
- [ ] **AC-3.2** — Quán mới có mô tả ≥ 10 ký tự được gắn tag khởi đầu.
- [ ] **AC-3.3** — AI lỗi hoặc vượt hạn mức khi xử lý review → **không** đưa lại hàng đợi vô hạn; review vẫn tồn tại, chưa có phân tích, có thể phân tích bù sau.

### US-4: Đọc ảnh menu trở lại (P2)

- [ ] **AC-4.1** — Ảnh menu ~20 món được đọc thành nhóm món / món / giá.
- [ ] **AC-4.2** — Giá viết tắt theo nghìn đồng ("62") được hiểu là 62.000.
- [ ] **AC-4.3** — Menu quá dài / chạm hạn mức → thông báo "Menu quá dài — hãy chụp từng phần" thay cho lỗi chung.

### US-5: Đổi model không cần sửa code (P2)

- [ ] **AC-5.1** — Mỗi chức năng AI đọc tên model từ biến môi trường riêng, có giá trị mặc định đúng.
- [ ] **AC-5.2** — Khi khởi động, service ghi log tên model đang dùng cho từng chức năng.

## 5. Yêu cầu chức năng

- **FR-1**: Phân tích câu tìm kiếm, gắn tag từ mô tả → `openai/gpt-oss-20b`.
- **FR-2**: Phân tích review → `openai/gpt-oss-120b`.
- **FR-3**: Đọc ảnh menu → `qwen/qwen3.8-27b`.
- **FR-4**: Vector ngữ nghĩa → giữ model `all-MiniLM-L6-v2` (384 chiều), nguồn sinh vector theo plan.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chi phí): Chạy được trên gói miễn phí Groq (30 req/phút, 8.000 token/phút, 200.000 token/ngày mỗi model — cần xác nhận ở console.groq.com).
- **NFR-2** (chịu lỗi): Mọi lời gọi AI có timeout + dự phòng (constitution §IV.2).
- **NFR-3** (toàn vẹn): Đầu ra AI vẫn được lọc theo danh mục DB (constitution §IV.1).

## 7. Trường hợp biên

- `gpt-oss` là model suy luận: token suy nghĩ tính vào giới hạn đầu ra → có thể cắt cụt JSON nếu giới hạn thấp.
- Model `qwen/qwen3.8-27b` đang ở trạng thái Preview → có thể bị gỡ.
- Vượt 200.000 token/ngày → tìm kiếm dùng dự phòng tới hết ngày.

## 8. Câu hỏi mở

- [x] ~~Nguồn sinh vector~~ → **Chạy `all-MiniLM-L6-v2` ngay trong service** (người dùng duyệt 2026-11-25). Xem plan §1.2.
- [x] ~~Có review nào bị bỏ qua trong thời gian AI hỏng?~~ → **Không có review mới** từ khi Groq gỡ Llama. Nhưng kiểm tra DB (2026-11-25) cho thấy **266 / 608 review có nội dung chưa từng được phân tích**: 265 review tháng 05/2026 (chủ yếu review mẫu import từ Google Maps — sự kiện bị bỏ qua hoặc Groq chạm giới hạn lúc import) + 1 review mẫu tháng 09/2026. Lần phân tích thành công gần nhất: 2026-06-25.
- [ ] **[CẦN LÀM RÕ]** Có phân tích bù 266 review cũ không? Ước tính ~2–2,5 nghìn token / review → ~600 nghìn token, vượt hạn mức 200 nghìn / ngày của `gpt-oss-120b` miễn phí → cần **3–4 ngày** chạy theo lô (endpoint backfill sẵn có đã tự dừng khi chạm giới hạn). Không bắt buộc cho spec này; nếu làm thì là script vận hành trong `tools/`, không phải kiểm thử. Chi tiết: [log.md](log.md) LOG-002.
- [ ] **[CẦN LÀM RÕ]** Sửa lỗi ghi điểm tag từ mô tả (AC-3.2 — [log.md](log.md) LOG-003): **A** — đổi điểm sàn `0.5 → 1` (không đổi schema, khuyến nghị) hay **B** — migration `venue_tags.score` sang `numeric(6,2)` (giữ thiết kế gốc, đổi schema DB nhóm)?

## 9. Tiến độ & khoảng trống

> **⏸️ Tạm dừng 2026-11-25** — người dùng ưu tiên hoàn thiện [spec 001](../001-auth-account/spec.md) trước. Tiếp tục từ task T16 khi có quyết định A / B.

**Đã làm (T1–T13):** chặn vòng lặp review, vector chạy cục bộ (lib `@mynook/embedding`), đổi model Groq qua biến môi trường, đọc menu bằng qwen, bộ test `test/ai/` (`npm run test:ai`). Chi tiết: [log.md](log.md) LOG-001.

**Kết quả `npm run test:ai` (2026-11-25): 7 / 8 đạt.**

| AC | Trạng thái |
|---|---|
| AC-1.1, 1.2 — hiểu câu tìm kiếm | ✅ 10/10 câu, p90 1,36 s |
| AC-2.1, 2.3, 2.4 — vector cục bộ, tương thích vector cũ | ✅ cosine 1,00000 |
| AC-2.2 — quán mới có vector ≤ 30 s | ✅ |
| AC-3.1 — review được phân tích | ✅ |
| **AC-3.2 — tag khởi đầu từ mô tả** | ❌ chưa đạt — LOG-003 |
| AC-3.3 — AI lỗi không lặp hàng đợi (review) | ✅ |
| AC-4.1–4.3 — đọc ảnh menu | ✅ |
| AC-5.1, 5.2 — đổi model qua env, log model | ✅ (kiểm qua log khởi động) |

**Khoảng trống còn mở:**

- [ ] **[GAP]** Tag từ mô tả không ghi được vào DB (`0.5` vào cột integer) — **chưa từng hoạt động**, có từ trước spec này (LOG-003).
- [ ] **[GAP] Rủi ro đang hiện hữu** — controller mô tả quán `nack + requeue` vô hạn khi lỗi → **mỗi quán tạo mới / sửa mô tả gây vòng lặp gọi Groq** cho tới khi sửa T17. Tránh tạo / sửa mô tả quán khi chạy hệ thống thật trong thời gian tạm dừng.
- [ ] **[GAP]** 266 review cũ chưa được phân tích (LOG-002).
- [ ] Chưa chạy lại `npm run e2e` (bộ auth) sau thay đổi của spec này.
