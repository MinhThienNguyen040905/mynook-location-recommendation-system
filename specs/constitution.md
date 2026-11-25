# MyNook — Constitution

> Các nguyên tắc **bắt buộc** cho mọi spec, plan và code trong dự án. Mỗi `plan.md` phải có mục "Constitution Check" đối chiếu với tài liệu này. Muốn vi phạm một nguyên tắc → ghi rõ lý do trong plan (mục *Ngoại lệ*) và được duyệt trước khi code.

---

## I. Spec đi trước code

1. Mọi tính năng mới hoặc thay đổi hành vi đáng kể **phải** có thư mục `specs/NNN-<ten>/` với `spec.md` được duyệt trước khi viết `plan.md`, và `plan.md` được duyệt trước khi code.
2. `spec.md` mô tả **CÁI GÌ và TẠI SAO** (người dùng, hành vi, tiêu chí chấp nhận) — không nhắc tới framework, bảng DB, tên file.
3. `plan.md` mô tả **LÀM THẾ NÀO** — kiến trúc, API, DB, event, rủi ro.
4. `tasks.md` là checklist triển khai; mỗi task nhỏ, kiểm chứng được, trỏ tới file cụ thể.
5. Code lệch khỏi spec → cập nhật spec trước (hoặc cùng commit), không để spec "chết".
6. Ngoại lệ không cần spec: sửa bug nhỏ không đổi hành vi đã đặc tả, refactor nội bộ, đổi style/UI nhỏ, cập nhật dependency.

## II. Kiến trúc microservice

1. **api-gateway là cửa duy nhất** ra ngoài. Frontend chỉ gọi gateway (`NEXT_PUBLIC_API_URL`). Các service con không expose ra internet.
2. **Mỗi schema DB có một service chủ sở hữu**, chỉ service đó được ghi:

   | Schema | Owner |
   |---|---|
   | `auth_schema` | auth-service |
   | `venue_schema` | venue-service |
   | `interaction_schema` | interaction-service |
   | `search_schema` | search-ai-service |

   Service khác được **đọc** (read-only) khi cần hiệu năng (vd. search-ai đọc `venues`, `cities`), nhưng muốn **ghi** phải gọi HTTP sang owner hoặc phát event.
3. **Giao tiếp:**
   - Đồng bộ (cần kết quả ngay) → HTTP qua `@nestjs/axios`, URL lấy từ `@mynook/shared-types`.
   - Bất đồng bộ (side-effect, enrich dữ liệu) → RabbitMQ topic exchange `mynook_events` qua `@mynook/rmq-messaging`. Routing key dạng `<domain>.<sự-kiện>` (vd. `venue.reviewed`).
   - Consumer phải **idempotent** và ack thủ công; service vẫn phải chạy được (HTTP-only) khi RabbitMQ không có.
4. Kiểu dữ liệu, enum, hằng số dùng chung giữa FE/BE đặt trong `libs/shared-types`. Không copy-paste kiểu giữa các app.

## III. Dữ liệu & migration

1. Thay đổi schema DB = file SQL mới trong `libs/database/src/lib/migrations/`, đánh số tăng dần (`NNN_mo_ta.sql`). **Không sửa** migration đã merge.
2. Entity TypeORM trong `libs/database/src/lib/entities/` phải khớp migration.
3. Migration phải chạy lại được an toàn (`IF NOT EXISTS`, `ON CONFLICT`...) khi có thể.
4. Cột do DB tự sinh (generated, trigger) khai báo `insert: false, update: false` ở entity.

## IV. AI là tín hiệu, không phải nguồn sự thật

1. Output của LLM (Groq) **luôn được sanitize** theo whitelist từ DB (category key, tag key...) trước khi dùng.
2. Mọi lời gọi AI/dịch vụ ngoài (Groq, HuggingFace, Cloudinary, SMTP) phải có **timeout + fallback**. Tính năng chính (search, CRUD) không được hỏng khi AI hỏng.
3. API key bí mật chỉ nằm ở backend. Không thêm biến `NEXT_PUBLIC_*` chứa secret mới.

## V. API & bảo mật

1. Endpoint mới ở gateway phải có Swagger decorator (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
2. Request body validate bằng DTO + `class-validator`.
3. Endpoint cần đăng nhập dùng `JwtAuthGuard`; endpoint admin dùng thêm `AdminGuard`. Quyền sở hữu (owner sửa venue của mình...) kiểm tra ở service, không chỉ ở FE.
4. Endpoint dễ bị lạm dụng (auth, search, review, upload) phải nằm trong rate limit Redis.
5. Không commit secret; biến môi trường mới phải được thêm vào `.env.example`.

## VI. Frontend

1. Gọi API qua `src/lib/api/*` (dùng `apiClient`), state server qua React Query, state client qua Zustand.
2. UI dùng component trong `src/components/ui` (shadcn) trước khi tự viết mới.
3. Route chia theo group: `(public)`, `(user)`, `(owner)`, `(admin)`, `(auth)`.

## VII. Chất lượng

1. Mỗi tiêu chí chấp nhận trong spec phải có cách kiểm chứng (test tự động hoặc bước kiểm thử thủ công ghi trong `tasks.md`).
2. Logic thuần (scoring, parsing, sanitize, tính toán) ưu tiên có unit test.
3. Trước khi đóng spec: `npx nx affected -t lint typecheck build` phải pass.

---

*Sửa constitution = một thay đổi có chủ đích: ghi lại ở mục Lịch sử bên dưới.*

## Lịch sử

| Ngày | Thay đổi |
|---|---|
| 2026-11-24 | Khởi tạo constitution từ kiến trúc hiện có. |
