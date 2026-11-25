# Log 001 — Tài khoản & xác thực

> Nhật ký sự cố và thay đổi của feature 001. Mỗi mục ghi **trước khi sửa** (vấn đề, nguyên nhân, kế hoạch) và cập nhật **sau khi sửa** (thay đổi thực tế, kết quả test). Mới nhất ở trên.

---

## LOG-004 — Đóng 5 khoảng trống còn lại của spec 001 (§9)

| | |
|---|---|
| Ngày | 2026-11-25 |
| Quyết định người dùng | Duyệt toàn bộ plan 001 · đồng ý chạy migration `014` trên DB nhóm · dùng **Mailpit** để kiểm thử email · **hoãn** T1–T4 (migration baseline) |
| Liên quan | spec 001 §9 GAP 1, 2, 3, 5, 6 · plan §4.2, §5, §7, §8 · task T5–T11, T13, T14, T28, T29 |
| Trạng thái | ✅ Đã sửa — 2026-11-25 |

### Kế hoạch theo từng khoảng trống

| GAP | Vấn đề | Cách sửa | Kiểm chứng (script trong `test/`) |
|---|---|---|---|
| **3** | Thiếu `JWT_SECRET` → dùng khoá mặc định cố định, kể cả production | `getJwtSecrets()` trong `libs/shared-types`: production thiếu khoá hoặc hai khoá trùng nhau → **lỗi khi khởi động**; dev dùng mặc định + cảnh báo. Thay 6 chỗ đọc `JWT_*` trực tiếp (auth-service ×2, gateway ×3) | `test/unit/jwt-secrets.spec.ts` (bộ unit mới `npm run test:unit`) |
| **2** | Gateway còn `POST /api/auth/register` — đăng ký không qua OTP | Gỡ endpoint khỏi gateway (+ DTO, regex rate limit, hàm `register()` không dùng ở web-client). auth-service giữ endpoint nội bộ | E2E: `/api/auth/register` → 404 |
| **5** | OTP sinh bằng `Math.random()` | `generateOtp()` dùng `crypto.randomInt(100000, 1000000)` | `test/unit/otp.spec.ts` |
| **6** | Không giới hạn số lần nhập sai OTP / email | Migration `014`: cột `attempts`; `verifyOtpAndRegister` tìm theo email, so hash bằng `timingSafeEqual`, sai → `attempts + 1`; đủ 5 → xoá OTP, báo "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới" | E2E: 5 lần sai → lần 6 mã đúng vẫn 400 |
| **1** | Quên mật khẩu chưa gửi email | Gửi email chứa liên kết `${APP_URL}/forgot-password?token=…` qua mailer sẵn có; trang quên mật khẩu đọc `?token=` → vào thẳng bước đặt mật khẩu mới. Mailer bỏ xác thực SMTP khi không có `SMTP_USER` (Mailpit) | E2E qua **Mailpit**: đọc email → mở liên kết → đặt mật khẩu → đăng nhập được. Thêm: email OTP đăng ký tới đúng hộp thư, đúng mã |

### Hạ tầng & việc phụ

- `docker-compose.yml`: thêm dịch vụ `mailpit` (cổng **1026** SMTP, **8026** giao diện — tránh xung đột dự án khác trên máy dùng 1025 / 8025); `npm run infra:up` khởi động cả Mailpit. Ghi vào [stack.md](../stack.md).
- Bộ E2E: auth-service chạy với `SMTP_HOST=localhost`, `SMTP_PORT=1026`, không xác thực; helper `test/support/mailpit.ts`.
- T14: `aria-label` cho 6 ô OTP và các ô ở trang quên mật khẩu.
- T11: bổ sung biến còn thiếu trong `.env.example` (`APP_URL`, `E2E_DATABASE_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_MAP_TILE_URL`, `*_SERVICE_URL`, cấu hình Mailpit).
- T1–T4 (migration baseline): **hoãn** theo quyết định người dùng.

### Tiêu chí hoàn thành

`npm run e2e` toàn bộ pass (gồm test mới), `npm run e2e -- --grep @redis` pass, `npm run test:unit` pass, typecheck + build các project bị ảnh hưởng pass. Spec §9 không còn GAP mở.

### Đã thực hiện (2026-11-25)

| GAP / task | File | Thay đổi |
|---|---|---|
| GAP 3 · T5–T6 | `libs/shared-types/src/lib/jwt-secrets.ts` (mới) | `getJwtSecrets()`: production thiếu / trùng khoá → lỗi khởi động; dev → mặc định + cảnh báo; thời hạn rỗng → `15m` / `7d` |
| | gateway `app.module.ts`, `jwt.strategy.ts`, `interaction.module.ts`; auth-service `auth.module.ts`, `auth.service.ts` | 6 chỗ đọc `JWT_*` trực tiếp → `getJwtSecrets()` |
| GAP 5, 6 · T7–T8 | `apps/auth-service/.../auth/otp.ts` (mới) | `generateOtp()` (`crypto.randomInt`), `hashOtp`, `otpMatches` (`timingSafeEqual`), `OTP_MAX_ATTEMPTS = 5` |
| | `014_registration_otp_attempts.sql` (mới) + entity `RegistrationOtp.attempts` | **Đã chạy trên DB nhóm** 2026-11-25 (cột `integer NOT NULL DEFAULT 0`; lúc chạy có 0 bản ghi OTP) |
| | `auth.service.ts#verifyOtpAndRegister` | Tìm theo email; sai → `attempts + 1`; đủ 5 → xoá OTP + "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới" |
| GAP 1 · T9, T13 | `auth.service.ts#forgotPassword` | Gửi email (text + HTML) chứa liên kết `${APP_URL}/forgot-password?token=…`; SMTP lỗi chỉ log; mailer bỏ xác thực khi không có `SMTP_USER` |
| | `(auth)/forgot-password/page.tsx` | Đọc `?token=` → vào thẳng bước "Mật khẩu mới"; bọc `Suspense` |
| GAP 2 · T10 | gateway `auth.controller.ts`, `dto/auth.dto.ts`, `redis-rate-limit.middleware.ts`; web-client `lib/api/auth.ts`, `config/api.ts`, `lib/api/client.ts` | Gỡ `POST /api/auth/register`, `GatewayRegisterDto`, hàm `register()` không dùng, các tham chiếu |
| T11 | `.env.example` | SMTP mặc định Mailpit, `APP_URL`, `CORS_ORIGIN`, `*_SERVICE_URL`, `NEXT_PUBLIC_MAP_TILE_URL`, `E2E_DATABASE_URL` |
| T14 | `register/page.tsx`, `forgot-password/page.tsx` | `aria-label` cho 6 ô OTP và 3 ô trang quên mật khẩu |
| Hạ tầng | `docker-compose.yml`, `package.json`, `specs/stack.md` | Dịch vụ `mailpit` (SMTP **1026**, UI / API **8026**); `infra:up` gồm Mailpit; script `test:unit` |
| Test | `test/playwright.config.ts`, `test/support/{mailpit,global-setup,global-teardown}.ts`, `test/playwright.unit.config.ts`, `test/unit/{jwt-secrets,otp}.spec.ts`, `register.spec.ts` (+5 test), `forgot-password.spec.ts` (+2 test) | auth-service trong E2E gửi mail vào Mailpit; setup báo lỗi rõ nếu Mailpit chưa chạy; dọn mail test trước / sau |

**Ngoài kế hoạch (bảo mật, nhỏ):** OTP và liên kết đặt lại mật khẩu trước đây bị `console.log` **ở mọi môi trường** → nay chỉ ghi log `debug` khi không phải production.

**Không thay đổi `.env` của người dùng:** `.env` đang cấu hình Gmail thật (thông tin đăng nhập bị Gmail từ chối). Bộ E2E tự ghi đè SMTP của auth-service sang Mailpit khi chạy test.

### Kết quả kiểm chứng

| Bước | Kết quả |
|---|---|
| `nx typecheck` auth-service, api-gateway, venue-service, interaction-service, search-ai-service (+6 lib) | ✅ |
| `tsc` web-client, bộ test | ✅ 0 lỗi |
| `npm run test:unit` | ✅ **12/12** (7 JWT, 5 OTP) |
| `npm run e2e` | ✅ **41/41** (1,8 phút) — 35 cũ + 6 mới |
| `npm run e2e -- --grep @redis` (Redis của MyNook) | ✅ **1/1** — lần thứ 11 → 429 + `Retry-After` |
| `nx build` auth-service, api-gateway, web-client (Next production) | ✅ |
| `lint` | ⚠️ Không chạy được — các project **chưa có target `lint`** (tồn tại từ trước) |

Test mới: `AC-1.1 (email)` OTP tới hộp thư · `GAP-6` sai 5 lần → huỷ mã · `GAP-6` sai < 5 lần vẫn đăng ký được · `GAP-2` register → 404 · `GAP-1` email chứa liên kết → mở liên kết → đổi mật khẩu → đăng nhập · `GAP-1` email lạ → không gửi mail.

---

## LOG-003 — Trang đăng nhập không báo riêng tài khoản bị khoá

| | |
|---|---|
| Ngày phát hiện | 2026-11-24 |
| Phát hiện bởi | E2E `test/e2e/auth/login.spec.ts` — "AC-2.3 (UI)" (`test.fail`) |
| Mức độ | Thấp — người bị khoá tưởng mình nhập sai mật khẩu, thử lại / đặt lại mật khẩu vô ích |
| Liên quan | spec 001 AC-2.3, §9 · plan §9b.2 · task T35–T38 |
| Trạng thái | ✅ Đã sửa — 2026-11-25 |

**Vấn đề.** Backend trả 401 + `"Tài khoản đã bị vô hiệu hóa"`, nhưng trang login hiện cứng "Email hoặc mật khẩu không đúng" cho mọi 401.

**Nguyên nhân gốc.** Phân biệt lỗi dựa vào status code, mà hai lỗi dùng chung 401; không có mã lỗi máy đọc được.

**Kế hoạch.** Giữ 401 + message, thêm `error_code: 'ACCOUNT_DISABLED'` (hằng số ở `libs/shared-types`) cho `login()` và `refresh()`; trang login rẽ nhánh theo `error_code`. Giữ thứ tự so mật khẩu trước → không lộ email tồn tại. Chi tiết: plan §9b.2.

**Tiêu chí hoàn thành.** Test "AC-2.3 (UI)" pass không cần `test.fail()`; test AC-2.2 vẫn pass.

### Đã thực hiện (2026-11-25)

| File | Thay đổi |
|---|---|
| `libs/shared-types/src/lib/shared-types.ts` | `AUTH_ERROR_CODES.ACCOUNT_DISABLED` + kiểu `AuthErrorCode` |
| `apps/auth-service/.../auth.service.ts` | Hàm `accountDisabled()` → 401 `{ statusCode, message, error, error_code: 'ACCOUNT_DISABLED' }`; dùng ở `login()` và `refresh()` (tách nhánh "không tồn tại" và "bị khoá" trong refresh); chú thích bắt buộc giữ thứ tự so mật khẩu trước |
| `apps/web-client/src/lib/constants.ts` | Bản sao `AUTH_ERROR_CODES` |
| `apps/web-client/src/app/(auth)/login/page.tsx` | 401 + `ACCOUNT_DISABLED` → "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên." |
| `test/e2e/auth/login.spec.ts` | Bỏ `test.fail()`; kiểm `error_code` cho login + refresh; test mới "bị khoá + sai mật khẩu → thông báo chung" |

**⚠️ Lệch kế hoạch:** plan §9b.2 dự định web-client import hằng số từ `@mynook/shared-types`. Khi làm phát hiện web-client chưa từng phụ thuộc lib này, và lib export kèm decorator dùng `@nestjs/common` → kéo code server vào bundle trình duyệt + phải sửa `next.config`. Đã đặt **bản sao** trong `web-client/lib/constants.ts`, hai nơi có chú thích trỏ nhau. Hành vi không đổi. Plan đã cập nhật.

### Kết quả kiểm chứng

| Bước | Kết quả |
|---|---|
| `nx typecheck auth-service` (kèm 3 lib phụ thuộc) | ✅ |
| `tsc --noEmit` web-client, bộ test | ✅ 0 lỗi |
| `npm run e2e` | ✅ **35/35 pass** (1,5 phút), **0 `test.fail()`** |

```
ok  9 › login.spec.ts:40 › AC-2.3 (API): tài khoản bị khoá → không đăng nhập, không làm mới phiên được
ok 11 › login.spec.ts:55 › AC-2.3 (UI): tài khoản bị khoá → giao diện báo tài khoản đã bị khoá
ok 14 › login.spec.ts:67 › AC-2.2 + AC-2.3: tài khoản bị khoá nhưng sai mật khẩu → chỉ nhận thông báo chung
ok  8 › login.spec.ts:22 › AC-2.2: sai mật khẩu và email không tồn tại → cùng một thông báo chung
```

---

## LOG-002 — Form đăng ký không có ô chọn vai trò

| | |
|---|---|
| Ngày phát hiện | 2026-11-24 |
| Phát hiện bởi | E2E `test/e2e/auth/register.spec.ts` — "AC-1.1 + AC-1.6 (UI)" (`test.fail`) |
| Mức độ | Trung bình — chủ quán không tự đăng ký được qua giao diện, phải nhờ admin sửa DB |
| Liên quan | spec 001 AC-1.1, AC-1.6, §9 · plan §9b.1 · task T32–T34 |
| Trạng thái | ✅ Đã sửa — 2026-11-25 |

**Vấn đề.** Form đăng ký luôn gửi `type: 'customer'`.

**Nguyên nhân gốc.** Schema, API và luồng chuyển trang đã hỗ trợ `owner`; chỉ thiếu control trên giao diện (`defaultValues: { type: 'customer' }` mà không có input nào gắn với trường `type`).

**Kế hoạch.** Thêm `<fieldset>` "Bạn là" với 2 radio Khách hàng / Chủ quán gắn `registerField('type')`, mặc định customer; bước OTP nhắc lại vai trò đã chọn. Không thêm thư viện. Chi tiết: plan §9b.1.

**Tiêu chí hoàn thành.** Test "AC-1.1 + AC-1.6 (UI)" pass không cần `test.fail()`: chọn Chủ quán → OTP → `/dashboard`, DB `type = owner`.

### Đã thực hiện (2026-11-25)

| File | Thay đổi |
|---|---|
| `apps/web-client/src/app/(auth)/register/page.tsx` | Hằng `ROLE_OPTIONS`; `<fieldset>` + `<legend>Bạn là</legend>` với 2 thẻ radio (Khách hàng — icon `Coffee`, Chủ quán — icon `Store`), input `sr-only` trong `<label>`, viền cam khi chọn, vòng focus khi dùng bàn phím; mặc định customer. Bước OTP thêm dòng "Đăng ký với vai trò: …" |
| `test/e2e/auth/register.spec.ts` | Bỏ `test.fail()`; test "mặc định Khách hàng"; test chọn Chủ quán → kiểm payload `type: owner` → OTP → `/dashboard` → DB `type = owner` |

Không thêm thư viện. Không đổi schema / API — chỉ giao diện.

### Kết quả kiểm chứng

`npm run e2e` → ✅ **35/35 pass**, 0 `test.fail()` (cùng lần chạy với LOG-003).

```
ok 33 › register.spec.ts:99  › AC-1.1 (UI): mặc định chọn sẵn vai trò Khách hàng
ok 34 › register.spec.ts:106 › AC-1.1 + AC-1.6 (UI): chọn Chủ quán → OTP → chuyển tới /dashboard, tài khoản type owner
ok 18 › register.spec.ts:10  › AC-1.1 + AC-1.3 + AC-1.6: khách hàng đăng ký qua giao diện … → về trang chủ
```

---

## LOG-001 — `proxy.ts` đọc sai tên cookie, kiểm tra quyền bị tắt khi dev

| | |
|---|---|
| Ngày phát hiện | 2026-11-24 |
| Phát hiện bởi | E2E Playwright (`test/e2e/auth/login.spec.ts`, `rbac.spec.ts`) + đọc code |
| Mức độ | **Cao** — chặn toàn bộ trang cần đăng nhập ở production |
| Liên quan | spec 001 AC-2.6, AC-5.1, §9 GAP 4 · plan 001 §7 · task T12 |
| Trạng thái | ✅ Đã sửa — 2026-11-25 |

### Vấn đề

1. **Sai tên cookie.** Khi đăng nhập, app ghi cookie `mynook_access_token` và `user_type` ([lib/api/auth.ts](../../apps/web-client/src/lib/api/auth.ts), [lib/constants.ts](../../apps/web-client/src/lib/constants.ts)). `proxy.ts` lại đọc `access_token` và `user_role` → luôn nhận `undefined`.
   - Ở production: mọi trang cần đăng nhập (`/favorites`, `/profile`, `/dashboard`, `/admin`) luôn chuyển về `/login`, kể cả khi đã đăng nhập → người dùng không vào được, đăng nhập lại cũng bị đẩy ra.
   - Dù sửa cookie token, cookie vai trò vẫn sai → admin / chủ quán bị đẩy về trang chủ.
2. **Kiểm tra quyền bị tắt khi dev.** `proxy.ts` trả về ngay khi `NODE_ENV === 'development'` → lỗi (1) bị che, chỉ lộ ra khi build production.

### Nguyên nhân gốc

Tên cookie được gõ tay ở hai nơi (chuỗi literal), không dùng chung hằng số → hai nơi lệch nhau mà không có gì báo lỗi.

### Kế hoạch sửa

| # | File | Thay đổi |
|---|---|---|
| 1 | `apps/web-client/src/lib/constants.ts` | Thêm `USER_TYPE_KEY = 'user_type'` |
| 2 | `apps/web-client/src/lib/api/auth.ts` | Dùng `USER_TYPE_KEY` thay chuỗi `'user_type'` (login, register, verifyOtp, logout) |
| 3 | `apps/web-client/src/proxy.ts` | Đọc cookie bằng `ACCESS_TOKEN_KEY`, `USER_TYPE_KEY`; thay nhánh `NODE_ENV === 'development'` bằng cờ `AUTH_DEV_BYPASS === 'true'` (mặc định tắt) |
| 4 | `.env.example` | Thêm `AUTH_DEV_BYPASS=false` kèm chú thích |
| 5 | `test/e2e/auth/login.spec.ts`, `rbac.spec.ts` | Bỏ `test.fail()` ở AC-2.6 và AC-5.1 (×2) |

Không đổi tên cookie (người dùng đang đăng nhập không bị đăng xuất). Không đổi hành vi đặc tả nào — chỉ làm code đúng với AC-2.6, AC-5.1.

### Tiêu chí hoàn thành

- `npm run e2e`: 3 test AC-2.6, AC-5.1 (×2) pass thật (không còn `test.fail`), các test khác không hỏng.

### Đã thực hiện (2026-11-25)

Làm đúng 5 mục của kế hoạch, không phát sinh thay đổi ngoài kế hoạch:

- `lib/constants.ts`: thêm `USER_TYPE_KEY = 'user_type'`.
- `lib/api/auth.ts`: 4 chỗ `'user_type'` → `USER_TYPE_KEY` (login, register, verifyOtp, logout).
- `proxy.ts`: đọc cookie bằng `ACCESS_TOKEN_KEY` / `USER_TYPE_KEY`; nhánh bỏ qua đổi thành `AUTH_DEV_BYPASS === 'true'`.
- `.env.example`: thêm `AUTH_DEV_BYPASS=false`.
- Bỏ `test.fail()` ở 3 test.

Rà soát: không còn chuỗi tên cookie gõ tay nào trong `apps/web-client/src` ngoài `lib/constants.ts`.

**Ảnh hưởng tới dev:** từ nay `npx nx serve web-client` cũng kiểm tra quyền trang như production. Muốn vào thẳng `/admin`, `/dashboard` khi dev mà không đăng nhập đúng vai trò → đặt `AUTH_DEV_BYPASS=true` trong `.env`.

### Kết quả kiểm chứng

| Bước | Kết quả |
|---|---|
| `tsc --noEmit` web-client | ✅ 0 lỗi |
| `tsc` bộ test | ✅ 0 lỗi |
| `npm run e2e` (toàn bộ) | ✅ **33/33 pass** (2,4 phút) — còn 2 `test.fail` cho GAP khác (form đăng ký thiếu chọn vai trò; thông báo tài khoản bị khoá) |
| `npm run e2e -- --grep "AC-2.6\|AC-5.1"` | ✅ **3/3 pass** (45,8 giây) |

```
ok 1 › rbac.spec.ts:33  › AC-5.1: chưa đăng nhập vào /favorites → chuyển tới /login kèm callbackUrl
ok 2 › login.spec.ts:63 › AC-2.6: đã đăng nhập mở /login → được chuyển về trang chủ
ok 3 › rbac.spec.ts:38  › AC-5.1: khách hàng vào /admin và /dashboard → bị chuyển về trang chủ
3 passed (45.8s)
```

Dữ liệu test được dọn sạch sau mỗi lần chạy (25 và 2 tài khoản `e2e+…@mynook.test`).

### Ghi chú

- Bản baseline của spec 001 (2026-11-24) đánh dấu AC-2.6 và AC-5.1 là `[x]` dựa trên đọc code ở chế độ dev — thực tế hai AC này **không đạt ở production** cho tới bản sửa này.
- Chưa kiểm thử trên bản build production (`next build && next start`); E2E chạy `next dev` với nhánh bỏ qua đã tắt, cùng đường code với production.
