# MyNook — Tech Stack

> Danh sách công nghệ **đã chọn** cho dự án. Thêm/đổi công nghệ = ghi vào mục *Quyết định công nghệ* bên dưới kèm lý do, và cập nhật plan của spec liên quan.

## 1. Tổng quan

| Lớp | Công nghệ | Phiên bản |
|---|---|---|
| Monorepo | Nx (npm workspaces) | 22.5 |
| Ngôn ngữ | TypeScript | ~5.9 |
| Runtime | Node.js | ≥ 20 |
| Frontend | Next.js (App Router) + React | 16.0 / 19 |
| Backend | NestJS | 11 |
| Database | PostgreSQL (Supabase) + pgvector + PostGIS + pg_trgm + unaccent | — |
| ORM | TypeORM | 0.3 |
| Message broker | RabbitMQ (topic exchange `mynook_events`) | 3.13 (Docker) |
| Cache / rate limit | Redis (ioredis) | 7.4 (Docker) |
| Media | Cloudinary | SDK 2.x |
| Email | Nodemailer (SMTP Gmail) | 8.x |

## 2. Backend

| Mục đích | Thư viện |
|---|---|
| HTTP giữa service | `@nestjs/axios` |
| Event bất đồng bộ | `@nestjs/microservices` (RMQ) + `amqplib`, `amqp-connection-manager` — bọc trong `@mynook/rmq-messaging` |
| Xác thực | `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`, `bcrypt` |
| Validation | `class-validator`, `class-transformer` |
| API docs | `@nestjs/swagger` (mỗi service có `/docs`) |
| Cấu hình | `@nestjs/config`, file `.env` ở root |
| Upload | `multer` → Cloudinary |
| Build | Webpack (`@nx/webpack`) + SWC |

## 3. AI / ML

| Chức năng | Dịch vụ / model | Nơi dùng |
|---|---|---|
| Trích xuất ý định tìm kiếm | Groq `openai/gpt-oss-20b` (JSON mode, `reasoning_effort: low`, timeout 3.5s) — đổi qua `GROQ_QUERY_MODEL` | search-ai-service |
| Phân tích review → tag | Groq `openai/gpt-oss-120b` — đổi qua `GROQ_REVIEW_MODEL` | search-ai-service |
| Gắn tag từ mô tả quán | Groq `openai/gpt-oss-20b` — đổi qua `GROQ_DESCRIPTION_MODEL` | search-ai-service |
| Đọc ảnh menu | Groq vision `qwen/qwen3.8-27b` (Preview) — đổi qua `GROQ_VISION_MODEL` | venue-service |
| Embedding | `all-MiniLM-L6-v2` (384 chiều) **chạy cục bộ trong service** bằng `@huggingface/transformers` (ONNX `Xenova/all-MiniLM-L6-v2`), lib `@mynook/embedding` | venue-service, search-ai-service |
| Speech-to-text (voice search) | Groq `whisper-large-v3` (gọi trực tiếp từ trình duyệt) | web-client |
| AI Nook Finder | Groq `llama-3.3-70b-versatile` (`src/lib/gemini.ts`) — **không được dùng ở đâu**, ứng viên xoá | web-client |
| Vector search | pgvector (HNSW, cosine) | PostgreSQL |

## 4. Frontend

| Mục đích | Thư viện |
|---|---|
| UI kit | shadcn/ui (Radix UI) + Tailwind CSS 4 |
| Icon | lucide-react |
| Animation | motion |
| Server state | TanStack React Query 5 |
| Client state | Zustand 5 |
| Form | react-hook-form + zod 4 (`@hookform/resolvers`) |
| HTTP | axios (`apiClient` có tự refresh token) |
| Bản đồ | Leaflet + react-leaflet |
| Thông báo toast | sonner |
| Ngày giờ | date-fns |

## 5. Hạ tầng & công cụ

| Mục đích | Công cụ |
|---|---|
| Dịch vụ local | Docker Compose (`redis`, `rabbitmq`, `mailpit`) |
| Hộp thư giả dev / E2E | Mailpit `axllent/mailpit:v1.27` — SMTP `:1026`, giao diện + API `:8026` (spec 001 LOG-004) |
| Lint / format | ESLint (Nx), Prettier |
| E2E (đã cài, chưa dùng) | Playwright |
| Import dữ liệu | Tampermonkey userscript (`tools/google-maps-importer`) |

## 6. Quy ước

- Cài package luôn từ root; một `package.json`, một `node_modules`.
- Path alias: `@mynook/<lib>` cho libs, `@/` cho web-client.
- Secret chỉ ở backend; biến `NEXT_PUBLIC_*` không chứa secret mới.

## 7. Quyết định công nghệ

| Ngày | Quyết định | Lý do | Thay thế đã cân nhắc |
|---|---|---|---|
| — | pgvector thay vì vector DB riêng | Một DB duy nhất, JOIN trực tiếp với dữ liệu venue, đủ cho quy mô đồ án | Pinecone, Qdrant |
| — | Groq cho LLM | Nhanh, có free tier, hỗ trợ JSON mode | OpenAI, Gemini |
| — | Userscript thay Google Places API | Places API tính phí | Places API, Chrome extension |
| — | Cache trong process cho search | 1 instance, độ trễ ~0ms; nâng lên Redis khi scale ngang | Redis |
| — | RabbitMQ local Docker làm mặc định | Ổn định hơn CloudAMQP cho dev | CloudAMQP |
| 2026-11-25 | Groq: Llama → `gpt-oss-20b` / `gpt-oss-120b` / `qwen3.8-27b` | Groq gỡ Llama khỏi gói miễn phí; model mới miễn phí, tên model đưa ra biến môi trường ([spec 018](018-ai-model-migration/spec.md)) | Gemini Flash (hạn mức thấp, dữ liệu có thể bị dùng huấn luyện) |
| 2026-11-25 | **Giữ** xác thực tự viết (`auth-service` + SMTP riêng), chưa dùng Supabase Auth — *xem lại trong tương lai* | Đã hoàn thiện + 41 test E2E; Supabase Auth vẫn cần SMTP riêng (dịch vụ mặc định chỉ gửi cho thành viên team, ~2 email / giờ); giữ kiến trúc microservice và kiểm thử email bằng Mailpit. Cân nhắc lại khi cần đăng nhập Google / Facebook hoặc xác thực 2 lớp ([spec 001](001-auth-account/spec.md) §10) | Supabase Auth |
| 2026-11-25 | Mailpit cho kiểm thử email | E2E đọc được email OTP / đặt lại mật khẩu qua API, không gửi email thật, không cần tài khoản Gmail | Ethereal (dịch vụ ngoài), chỉ dùng mã trả về ở dev (không kiểm được việc gửi email) |
| 2026-11-25 | Embedding chạy cục bộ (`@huggingface/transformers`) thay HuggingFace Inference API | HF API hết hạn mức miễn phí; chạy cục bộ cùng model → tương thích vector cũ, miễn phí, không giới hạn | Token HF khác, nạp credit HF |
