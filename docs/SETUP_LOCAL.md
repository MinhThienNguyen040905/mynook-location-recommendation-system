# MyNook — Chạy hệ thống local với Supabase

> Hướng dẫn từ máy trắng tới chạy được toàn bộ hệ thống và test E2E. Các bước đánh dấu ⏳ phụ thuộc task chưa làm trong [specs/001-auth-account/tasks.md](../specs/001-auth-account/tasks.md).

## 0. Cần có

| Công cụ | Phiên bản | Kiểm tra |
|---|---|---|
| Node.js | ≥ 20 | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Docker Desktop | bất kỳ | `docker -v` (cho Redis + RabbitMQ) |
| psql (tuỳ chọn) | ≥ 15 | `psql --version` (để chạy migration bằng tay) |

```bash
npm install                 # cài dependencies cho toàn monorepo (chạy ở root)
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

---

## 1. Nối Supabase

### 1.1 Chọn database

| Trường hợp | Làm gì |
|---|---|
| **A. Dùng database nhóm đang có** (khuyến nghị để bắt đầu) | Xin connection string của project Supabase nhóm → làm 1.3, bỏ qua 1.4 |
| **B. Tạo project Supabase riêng** | Làm 1.2 → 1.4. ⏳ Cần task T2–T3 (migration baseline) vì các migration hiện có không tự tạo bảng gốc |
| **C. Project riêng cho test E2E** | Bắt buộc khi chạy E2E (test sẽ tạo / xoá tài khoản). Làm như B, lấy URL đặt vào `E2E_DATABASE_URL` |

### 1.2 Tạo project

1. Vào <https://supabase.com/dashboard> → **New project**.
2. Đặt mật khẩu database (lưu lại), chọn region **Southeast Asia (Singapore)**.
3. Chờ project khởi tạo xong (~2 phút).

### 1.3 Lấy connection string — **dùng Session pooler**

Dashboard → **Connect** (nút trên cùng) → tab **Connection string** → chọn **Session pooler**:

```
postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

Điền vào `.env`:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
DB_POOL_MAX=3
```

> ⚠️ **Không dùng "Direct connection"** (`db.<ref>.supabase.co`): code chỉ bật SSL khi URL chứa `supabase.com` ([database.module.ts](../libs/database/src/lib/database.module.ts)), host `.supabase.co` sẽ kết nối không SSL và bị từ chối. Direct connection còn chỉ hỗ trợ IPv6.
>
> Mật khẩu có ký tự đặc biệt (`@ # / ?`) phải URL-encode, ví dụ `@` → `%40`.
>
> `DB_POOL_MAX=3`: 5 service × 3 = 15 kết nối — vừa giới hạn Session pooler gói free. Đừng tăng.

### 1.4 Tạo schema (chỉ trường hợp B / C)

**Bật extension** — Dashboard → **SQL Editor** → chạy:

```sql
create extension if not exists vector;
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
```

**Chạy migration** ⏳ (sau khi có T2–T3):

```bash
npm run db:migrate                       # chạy 000 → mới nhất, bỏ qua file đã chạy
npm run db:migrate -- --dry-run          # xem sẽ chạy những file nào
```

Database nhóm đã có sẵn bảng (trường hợp A, nếu muốn quản lý migration từ nay):

```bash
npm run db:migrate -- --baseline-existing   # đánh dấu 000–013 đã chạy, chỉ chạy file mới
```

Chạy bằng tay khi chưa có script (chỉ đúng khi database **đã có** bảng gốc):

```bash
for f in libs/database/src/lib/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

### 1.5 Tạo tài khoản admin

Đăng ký một tài khoản bình thường trên giao diện (mục 3), rồi nâng quyền trong **SQL Editor**:

```sql
update auth_schema.accounts set type = 'admin' where email = '<email-của-bạn>';
```

Đăng xuất, đăng nhập lại để phiên mới mang vai trò admin.

---

## 2. Điền các biến còn lại trong `.env`

| Biến | Bắt buộc? | Lấy ở đâu / giá trị |
|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Có | Hai chuỗi ngẫu nhiên **khác nhau**: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Không | Mặc định `15m` / `7d` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Để nhận email OTP / đặt lại mật khẩu | **Dev (khuyến nghị):** Mailpit — `SMTP_HOST=localhost`, `SMTP_PORT=1026`, để trống user / pass; xem thư tại <http://localhost:8026>. **Gửi thật:** Gmail `smtp.gmail.com:587` + [App Password](https://myaccount.google.com/apppasswords) |
| `APP_URL` | Không | Địa chỉ web dùng trong liên kết email (mặc định `NEXT_PUBLIC_APP_URL`) |
| `GROQ_API_KEY` | Cho tìm kiếm AI, tag, đọc menu | <https://console.groq.com/keys> — thiếu thì tìm kiếm vẫn chạy (kém thông minh hơn) |
| `HUGGINGFACE_API_TOKEN` | Cho embedding (tìm kiếm ngữ nghĩa, gợi ý) | <https://huggingface.co/settings/tokens> (quyền *Read*). **Chưa có trong `.env.example`** — tự thêm dòng này |
| `CLOUDINARY_*` | Cho upload ảnh | <https://cloudinary.com/console> |
| `REDIS_URL`, `RMQ_URL` | Có giá trị mặc định | Giữ nguyên nếu chạy Docker ở mục 3 |
| `AUTH_DEV_BYPASS` ⏳ | Không | `false` (mặc định) — kiểm tra quyền trang như production |

---

## 3. Chạy hệ thống

```bash
npm run infra:up            # Redis :6379 + RabbitMQ :5672 (UI :15672, guest/guest) + Mailpit (SMTP :1026, UI :8026)
npm run dev:all             # = npx nx run-many -t serve — chạy 5 service + web-client
```

Chỉ làm phần đăng nhập (nhẹ máy hơn):

```bash
npx nx run-many -t serve --projects=auth-service,api-gateway,web-client
# thêm interaction-service nếu muốn nhận thông báo chào mừng
```

| Kiểm tra | URL |
|---|---|
| Web | <http://localhost:3000> |
| API Gateway + Swagger | <http://localhost:3001/docs> |
| Auth service Swagger | <http://localhost:3002/docs> |

### Gỡ lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `no pg_hba.conf entry ... SSL off` / `self signed certificate` | Đang dùng Direct connection → đổi sang Session pooler (1.3) |
| `password authentication failed` | Sai mật khẩu, hoặc chưa URL-encode ký tự đặc biệt |
| `MaxClientsInSessionMode: max clients reached` | Tăng `DB_POOL_MAX` quá cao hoặc chạy trùng service → giữ `3`, tắt tiến trình cũ |
| `relation "auth_schema.accounts" does not exist` | Database chưa có schema → mục 1.4 |
| `type "vector" does not exist` | Chưa bật extension → mục 1.4 |
| Log `RabbitMQ not available ... HTTP-only mode` | Chưa `npm run infra:up` — hệ thống vẫn chạy, chỉ mất thông báo chào mừng / tag AI |
| `429 Too many requests` khi thử đăng nhập nhiều | Rate limit 10 lần / 5 phút → chờ, hoặc đặt `RATE_LIMIT_AUTH_LIMIT=1000` khi dev |
| Không nhận được email OTP | Chưa cấu hình SMTP → lấy mã trong log auth-service (`[AUTH] OTP for ...`) |

---

## 4. Chạy test E2E (Playwright)

Bộ test nằm ở [test/](../test/): `test/e2e/auth/*.spec.ts` (theo từng user story của spec 001), helper ở `test/support/`.

**Cần chạy trước:** `npm run infra:up` — bộ E2E đọc email OTP / đặt lại mật khẩu từ **Mailpit** (báo lỗi ngay nếu Mailpit chưa chạy). auth-service trong lúc test tự gửi mail vào Mailpit, không dùng SMTP trong `.env`.

```bash
npx playwright install chromium     # tải trình duyệt (một lần)
npm run test:unit                   # test đơn vị (khoá JWT, OTP) — vài giây, không cần service
npm run e2e                         # tự build + khởi động auth-service, api-gateway, web-client rồi chạy test (~2–3 phút)
npm run test:ai                     # bộ test AI (spec 018) — tốn hạn mức Groq
npm run e2e:ui                      # chế độ giao diện, xem từng bước
npm run e2e:report                  # mở báo cáo HTML của lần chạy gần nhất
npm run e2e -- test/e2e/auth/login.spec.ts   # chỉ chạy một file
```

PowerShell — nhóm test cần Redis (rate limit), chạy `npm run infra:up` trước:

```powershell
$env:E2E_REDIS='1'; npm run e2e -- --grep "@redis"
```

**Dữ liệu:** test tạo tài khoản qua luồng OTP thật với email `e2e+…@mynook.test` và xoá chúng (kèm OTP, thông báo) trước và sau mỗi lần chạy. Code ghi DB của test từ chối mọi email khác dạng này. Mặc định test chạy trên `DATABASE_URL`; muốn tách riêng thì đặt `E2E_DATABASE_URL` **và** trỏ các service tới cùng database đó.

**Kết quả "expected fail":** test có `test.fail()` là chỗ ứng dụng chưa đạt spec (GAP). Chúng *pass* khi lỗi vẫn còn; khi sửa xong GAP, test sẽ báo "unexpectedly passed" → bỏ `test.fail()`.

**Log ồn có thể bỏ qua:** `ECONNREFUSED localhost:3003` (trang chủ gọi venue-service không được khởi động cho bộ test auth), `Failed to send OTP email` (chưa cấu hình SMTP — đúng NFR-3, luồng vẫn chạy).

Đang chạy sẵn các service bằng `npm run dev:all` thì Playwright dùng lại (`reuseExistingServer`), không khởi động lần hai.
