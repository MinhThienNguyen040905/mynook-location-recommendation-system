---
spec: '001'
status: approved
updated: 2026-11-25
---

# Plan 001 — Tài khoản & xác thực

> Hiện thực phần còn thiếu của [spec.md](spec.md): đóng 6 khoảng trống ở mục 9 và phủ toàn bộ AC bằng test E2E (Playwright). Kèm hai việc nền bắt buộc: dựng database từ repo (migration baseline) và dựng hạ tầng E2E.

## 1. Tóm tắt giải pháp

Không thiết kế lại luồng xác thực — luồng hiện tại đã đáp ứng các AC. Plan gồm 4 mảng:

1. **Nền database**: thêm migration `000_baseline_schema.sql` tạo các schema / bảng gốc mà migration 001–013 đang giả định đã có, và một script chạy migration theo thứ tự có bảng theo dõi. Không có bước này thì không dựng được Supabase mới từ repo.
2. **Đóng khoảng trống bảo mật** (spec mục 9): gửi email đặt lại mật khẩu thật, gỡ đường đăng ký không OTP khỏi gateway, bắt buộc khoá ký ở production, OTP sinh bằng bộ sinh an toàn, giới hạn 5 lần nhập sai OTP, thay "tắt kiểm tra quyền ở dev" bằng cờ môi trường tường minh.
3. **Hạ tầng E2E**: project Nx `apps/web-client-e2e` dùng Playwright, tự khởi động auth-service + api-gateway + web-client, đọc OTP / mã đặt lại từ phản hồi dev, dọn dữ liệu test trực tiếp qua Postgres.
4. **Test E2E** phủ US-1 → US-5.

Câu hỏi mở "đổi email" (spec §8) **không** nằm trong plan này — giữ nguyên hành vi không cho đổi email.

## 2. Constitution Check

| Nguyên tắc | Tuân thủ? | Ghi chú |
|---|---|---|
| II.1 Gateway là cửa duy nhất | ✅ | E2E đi qua gateway; gỡ `/auth/register` khỏi gateway |
| II.2 Chỉ owner ghi schema | ⚠️ | Helper E2E ghi thẳng `auth_schema` để dọn dữ liệu / khoá tài khoản — chỉ trong test, xem *Ngoại lệ* |
| II.3 HTTP vs RMQ, consumer idempotent | N/A | Không đổi sự kiện `user.registered` |
| III Migration mới, không sửa migration cũ | ✅ | Thêm `000_baseline` và `014_*`, không sửa 001–013 |
| IV AI có sanitize + fallback | N/A | |
| V Swagger, DTO validation, guard, rate limit | ✅ | DTO mới có validator; rate limit auth giữ nguyên, cấu hình được cho E2E |
| VI FE dùng lib/api + React Query | ✅ | Trang quên mật khẩu đọc `?token=` qua `lib/api/auth` |
| VII Mọi AC có cách kiểm chứng; lint/typecheck/build pass | ✅ | Bảng §9 |

### Ngoại lệ

- **II.2** — Test E2E cần tạo trạng thái (khoá tài khoản, xoá tài khoản test) mà không có API công khai tương ứng. Helper chỉ chạy trong `apps/web-client-e2e`, chỉ chạm các email `e2e+*@mynook.test`, và **chỉ được trỏ tới database test** (kiểm tra biến `E2E_DATABASE_URL` khác `DATABASE_URL`). Phương án thay thế (gọi API admin) bị loại vì cần thêm tài khoản admin và làm test phụ thuộc spec 015.
- **000_baseline** tạo bảng bằng `IF NOT EXISTS` nên chạy an toàn trên database đã có dữ liệu (Supabase hiện tại của nhóm) — không vi phạm III.

## 3. Service bị ảnh hưởng

| App / lib | Thay đổi |
|---|---|
| libs/database | `000_baseline_schema.sql`, `014_registration_otp_attempts.sql`; entity `RegistrationOtp.attempts` |
| libs/shared-types | `getJwtSecrets()` dùng chung: đọc secret, ném lỗi khi thiếu ở production |
| auth-service | OTP bằng `crypto.randomInt`; đếm lần sai OTP; gửi email đặt lại mật khẩu; dùng `getJwtSecrets()` |
| api-gateway | Gỡ `POST /auth/register`; dùng `getJwtSecrets()`; bỏ `register` khỏi regex rate limit |
| web-client | `proxy.ts` dùng cờ `AUTH_DEV_BYPASS`; trang quên mật khẩu nhận `?token=`; bổ sung nhãn truy cập cho form (phục vụ E2E) |
| apps/web-client-e2e (mới) | Playwright config, fixtures, helper DB, các spec test |
| tools/db (mới) | `migrate.mjs` chạy migration theo thứ tự |
| docs | [SETUP_LOCAL.md](../../docs/SETUP_LOCAL.md) — nối Supabase, chạy hệ thống, chạy E2E |

## 4. Mô hình dữ liệu

### 4.1 `000_baseline_schema.sql`

Tạo (idempotent) các schema `auth_schema`, `venue_schema`, `interaction_schema`, `search_schema` và mọi bảng / enum mà migration 001–013 `ALTER` hoặc tham chiếu, với cột **ở trạng thái trước migration 001** (các cột do 001–013 thêm thì để 001–013 thêm). Nguồn sự thật để dựng: entity TypeORM hiện tại trừ đi phần các migration sau thêm vào.

Bảng tối thiểu: `auth_schema.accounts`, `auth_schema.registration_otps`, `venue_schema.venues`, `venue_schema.menu_categories`, `venue_schema.menu_items`, `interaction_schema.reviews`, `interaction_schema.user_favorites`, `interaction_schema.user_interactions`, `interaction_schema.notifications`, `search_schema.tags`, `search_schema.venue_tags`, `search_schema.search_logs`; enum `account_type`, `crowd_level`, `notification_type`, `time_context`.

Kiểm chứng: chạy `000 → 013` trên một Supabase trống, rồi khởi động cả 5 service không lỗi entity.

### 4.2 `014_registration_otp_attempts.sql`

```sql
ALTER TABLE auth_schema.registration_otps
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;
```

### 4.3 Bảng theo dõi migration

`tools/db/migrate.mjs` tạo `public.schema_migrations(filename text primary key, applied_at timestamptz)`, chạy các file chưa có theo thứ tự tên, mỗi file trong một transaction. Cờ `--baseline-existing` đánh dấu 000–013 là đã chạy (cho database nhóm đang dùng).

## 5. API contract

### Gateway (public) — thay đổi

| Method | Path | Thay đổi |
|---|---|---|
| POST | `/api/auth/register` | **Gỡ bỏ** (404). Đăng ký chỉ qua `send-otp` → `verify-otp` (đóng GAP 2) |
| POST | `/api/auth/verify-otp` | Sai mã: tăng `attempts`; đến 5 lần thì xoá bản ghi OTP, trả 400 "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới" (đóng GAP 6) |
| POST | `/api/auth/forgot-password` | Gửi email chứa liên kết `${APP_URL}/forgot-password?token=<raw>`; phản hồi không đổi; dev vẫn trả `dev_reset_token` (đóng GAP 1) |

Các endpoint còn lại giữ nguyên.

### Thay đổi hành vi nội bộ

- `verifyOtpAndRegister`: tìm bản ghi theo **email** (không theo email + hash) để đếm được lần sai; so khớp hash bằng `crypto.timingSafeEqual`.
- OTP: `crypto.randomInt(100000, 1000000)` (đóng GAP 5).

## 6. Event (RabbitMQ)

Không thay đổi. `user.registered` vẫn phát khi tạo tài khoản qua OTP.

## 7. Frontend

- `proxy.ts`: bỏ nhánh `NODE_ENV === 'development'`; thay bằng `process.env.AUTH_DEV_BYPASS === 'true'` (mặc định tắt). `.env.example` ghi rõ (đóng GAP 4).
- `(auth)/forgot-password/page.tsx`: có `?token=` thì vào thẳng bước đặt mật khẩu mới.
- Form đăng nhập / đăng ký / quên mật khẩu: đảm bảo mỗi input có `<label htmlFor>` hoặc `aria-label`; 6 ô OTP có `aria-label="Chữ số OTP thứ n"` → E2E chọn phần tử bằng `getByLabel` / `getByRole`, không dùng class CSS.

## 8. Xử lý lỗi & fallback

- **Khoá ký** (đóng GAP 3): `getJwtSecrets()` trong `libs/shared-types` — `NODE_ENV=production` mà thiếu `JWT_SECRET` hoặc `JWT_REFRESH_SECRET` → ném lỗi lúc khởi động (fail fast). Dev vẫn dùng giá trị mặc định nhưng log cảnh báo. Gateway và auth-service cùng dùng hàm này để không lệch secret.
- SMTP lỗi khi gửi email đặt lại → log cảnh báo, phản hồi vẫn trung tính (giữ NFR-3).

## 9. Kiểm thử

Toàn bộ chạy bằng Playwright qua giao diện thật, trừ chỗ ghi *(API)* là gọi gateway bằng `request` fixture của Playwright.

| AC | File test | Cách kiểm chứng |
|---|---|---|
| AC-1.1, 1.3, 1.6 | `register.spec.ts` | Điền form → đọc `dev_otp` từ phản hồi `send-otp` → nhập 6 ô → về trang chủ (customer) / `/dashboard` (owner); chuông có thông báo chào mừng *(nếu interaction-service chạy — test đánh dấu `@full`)* |
| AC-1.2 | `register.spec.ts` | Đăng ký email đã tồn tại → toast "Email đã được sử dụng" |
| AC-1.4 | `register.spec.ts` | Nhập mã sai → toast lỗi, 6 ô được xoá |
| AC-1.5 | `register.spec.ts` *(API)* | Gửi mã 2 lần, dùng mã đầu → 400 |
| GAP 6 | `register.spec.ts` *(API)* | Sai 5 lần → lần 6 dùng mã đúng vẫn 400 |
| AC-2.1 | `login.spec.ts` | Đăng nhập customer → trang chủ; owner → `/dashboard` |
| AC-2.2 | `login.spec.ts` | Sai mật khẩu và email không tồn tại → cùng một thông báo |
| AC-2.3 | `login.spec.ts` | Khoá tài khoản bằng helper DB → đăng nhập bị từ chối |
| AC-2.4 | `session.spec.ts` | Thay cookie `access_token` bằng giá trị hỏng, giữ refresh → thao tác cần đăng nhập (mở `/favorites`) vẫn thành công, cookie mới được ghi |
| AC-2.5 | `session.spec.ts` | Hỏng cả hai cookie → bị chuyển tới `/login` |
| AC-2.6 | `login.spec.ts` | Đã đăng nhập mở `/login` → về `/` |
| AC-3.1–3.4 | `forgot-password.spec.ts` | Email lạ và email thật → cùng thông báo; dùng `dev_reset_token` qua `?token=` → đổi mật khẩu → đăng nhập bằng mật khẩu mới; token sai → lỗi |
| AC-4.1–4.3 | `profile.spec.ts` | Đổi mật khẩu đúng / sai mật khẩu cũ; cập nhật họ tên → giữ email |
| AC-5.1 | `rbac.spec.ts` | Chưa đăng nhập vào `/favorites` → `/login?callbackUrl=/favorites`; customer vào `/admin`, `/dashboard` → `/` |
| AC-5.2 | `rbac.spec.ts` *(API)* | Token customer gọi `GET /api/admin/accounts` → 403 |
| AC-5.3 | `register.spec.ts` *(API)* | `send-otp` với `type: "admin"` → 400 |
| GAP 2 | `register.spec.ts` *(API)* | `POST /api/auth/register` → 404 |
| NFR-2 | `rate-limit.spec.ts` | `@redis` — chỉ chạy khi bật Redis: 11 lần đăng nhập sai → 429 có `Retry-After` |
| GAP 3 | Unit test `getJwtSecrets` | production + thiếu secret → ném lỗi |
| GAP 5 | Unit test | OTP luôn 6 chữ số, sinh bằng `randomInt` |

Môi trường E2E: `NODE_ENV=development` (để nhận `dev_otp`), `AUTH_DEV_BYPASS=false`, `REDIS_ENABLED=false` (trừ nhóm `@redis`), database là **project Supabase riêng cho test**.

## 9b. Bổ sung 2026-11-25 — hai GAP do E2E phát hiện

Hai GAP mới ở spec §9, đều thuộc AC đã có (không đổi spec). Ghi log trước khi sửa: [log.md](log.md) LOG-002, LOG-003.

### 9b.1 Form đăng ký thiếu ô chọn vai trò — AC-1.1, AC-1.6 (LOG-002)

**Hiện trạng.** `registerSchema` đã có trường `type: 'customer' | 'owner'`, `onSubmit` đã gửi `type`, `handleVerifyOtp` đã chuyển chủ quán tới `/dashboard`, gửi lại OTP cũng dùng `getValues().type`. Chỉ **thiếu control trên giao diện** — form luôn gửi giá trị mặc định `customer`.

**Giải pháp.** Thêm nhóm chọn vai trò vào `apps/web-client/src/app/(auth)/register/page.tsx`, đặt **trên** ô Họ tên:

```
  Bạn là
  ┌─────────────────────────┐ ┌─────────────────────────┐
  │ (●) ☕ Khách hàng        │ │ ( ) 🏪 Chủ quán          │
  │ Khám phá & đánh giá quán │ │ Đưa quán của bạn lên     │
  └─────────────────────────┘ └─────────────────────────┘
```

- `<fieldset>` + `<legend>Bạn là</legend>`, hai `<input type="radio" {...registerField('type')} value="customer|owner">` bọc trong `<label>` dạng thẻ (Tailwind, theo [ux-ui.md](../ux-ui.md): bo `rounded-xl`, viền `border-gray-300`, thẻ đang chọn viền + nền nhấn cam). Icon `Coffee` / `Store` từ `lucide-react` (đã có).
- Không thêm thư viện: `components/ui` chưa có radio-group, dùng input gốc → bàn phím (mũi tên) và trình đọc màn hình hoạt động sẵn; Playwright chọn bằng `getByRole('radio', { name: /Chủ quán/ })`.
- Mặc định vẫn `customer` (giữ hành vi cũ cho người không chọn).
- Bước OTP hiển thị thêm dòng "Đăng ký với vai trò: Chủ quán" để người dùng thấy mình đã chọn gì.

**Ngoài phạm vi:** các nhãn tiếng Anh còn lại của trang ("Create an account", "Full Name"...) — ghi nhận ở [ux-ui.md](../ux-ui.md) §8, xử lý riêng.

### 9b.2 Trang đăng nhập không báo riêng tài khoản bị khoá — AC-2.3 (LOG-003)

**Hiện trạng.** Backend trả **401** với message `"Tài khoản đã bị vô hiệu hóa"` (gateway chuyển nguyên thân phản hồi). Trang login bắt mọi 401 và hiện cứng `"Email hoặc mật khẩu không đúng"`.

**Phương án đã cân nhắc:**

| # | Cách | Nhận xét |
|---|---|---|
| A | FE hiện `response.data.message` cho mọi 401 | Ít sửa nhất, nhưng phụ thuộc vào câu chữ backend; backend đổi câu là hỏng |
| B | Backend đổi sang **403** cho tài khoản bị khoá | Đúng ngữ nghĩa HTTP, nhưng đổi hợp đồng API (refresh cũng trả 401) |
| **C** ✅ | Giữ 401 + message, **thêm mã máy `error_code: 'ACCOUNT_DISABLED'`** vào thân lỗi; FE rẽ nhánh theo `error_code` | Không phá client cũ, không phụ thuộc câu chữ, mở rộng được cho mã lỗi khác |

**Giải pháp (C).**

- `apps/auth-service/.../auth.service.ts`: `login()` và `refresh()` ném `new UnauthorizedException({ message: 'Tài khoản đã bị vô hiệu hóa', error_code: 'ACCOUNT_DISABLED' })`. Message giữ nguyên → test API hiện có vẫn đúng.
- `libs/shared-types`: hằng số `AUTH_ERROR_CODES = { ACCOUNT_DISABLED: 'ACCOUNT_DISABLED' } as const` cho backend. **Web-client giữ bản sao** trong `lib/constants.ts` *(điều chỉnh khi làm, 2026-11-25: lib shared-types export kèm decorator `@nestjs/common`, import vào Next.js sẽ kéo code server vào bundle — xem LOG-003)*.
- `apps/web-client/.../login/page.tsx`: nhánh 401 → nếu `error_code === ACCOUNT_DISABLED` hiện toast lỗi *"Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên."*; ngược lại giữ *"Email hoặc mật khẩu không đúng"*.

**Bảo mật — không lộ email tồn tại:** `login()` so mật khẩu **trước** khi kiểm tra `is_active`, nên thông báo "bị khoá" chỉ hiện khi người nhập đã đúng cả email lẫn mật khẩu. Người dò email vẫn chỉ nhận thông báo chung (AC-2.2 giữ nguyên). Thứ tự này phải giữ — ghi chú ngay trong code.

**Ngoài phạm vi:** tài khoản bị khoá **trong khi đang dùng** → lần làm mới phiên thất bại, `apiClient` chuyển về `/login` nhưng không nói lý do. Có thể làm sau bằng `?reason=account_disabled`.

### 9b.3 Constitution Check (bổ sung)

| Nguyên tắc | | Ghi chú |
|---|---|---|
| II.4 Kiểu dùng chung ở shared-types | ✅ | `AUTH_ERROR_CODES` |
| V API — không đổi status code | ✅ | Chỉ thêm trường vào thân lỗi |
| VI FE + [ux-ui.md](../ux-ui.md) | ✅ | Control tiếng Việt, có nhãn truy cập, không thêm thư viện |

### 9b.4 Kiểm thử

| AC | Test | Thay đổi |
|---|---|---|
| AC-1.1, AC-1.6 | `register.spec.ts` | Bỏ `test.fail()`; viết lại: chọn "Chủ quán" → OTP → `/dashboard`, DB `type = owner` |
| AC-1.1 | `register.spec.ts` | Mới: không chọn gì → `customer` được chọn sẵn |
| AC-2.3 (UI) | `login.spec.ts` | Bỏ `test.fail()`; mong đợi câu "Tài khoản của bạn đã bị khoá" |
| AC-2.3 (API) | `login.spec.ts` | Thêm kiểm `error_code === 'ACCOUNT_DISABLED'` cho login và refresh |
| AC-2.2 | `login.spec.ts` | Giữ nguyên — xác nhận sai mật khẩu với tài khoản bị khoá vẫn chỉ nhận thông báo chung (mới) |

## 10. Rủi ro & phương án thay thế

| Rủi ro | Giảm thiểu |
|---|---|
| `000_baseline` lệch với database nhóm đang dùng | Dùng `IF NOT EXISTS`; đối chiếu bằng `pg_dump --schema-only` của database nhóm trước khi merge |
| E2E chạy vào database thật của nhóm, xoá nhầm | Helper từ chối chạy khi `E2E_DATABASE_URL` trống hoặc trùng `DATABASE_URL`; chỉ xoá email `e2e+%@mynook.test` |
| Pool kết nối Supabase free bị đầy khi chạy nhiều service + test song song | `DB_POOL_MAX=3`, Playwright `workers: 2` |
| Gỡ `/auth/register` làm hỏng chỗ nào đang gọi | Tìm toàn repo trước khi gỡ (hiện chỉ có `client.ts` liệt kê để bỏ qua refresh) |
| Phương án thay thế đã cân nhắc: Mailpit / Ethereal để bắt email thật trong E2E | Để sau; dev đã trả mã trong phản hồi, đủ cho các AC hiện tại |
