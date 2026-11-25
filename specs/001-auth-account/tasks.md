---
spec: '001'
updated: 2026-11-24
---

# Tasks 001 — Tài khoản & xác thực

> Làm theo thứ tự. `[P]` = làm song song được với task liền trước. Chỉ bắt đầu khi [plan.md](plan.md) ở `status: approved`.

## Phase 0 — Nền database (bắt buộc để chạy hệ thống trên Supabase mới)

- [ ] ~~**T1**~~ ⏸️ *hoãn 2026-11-25* Dump schema database nhóm đang dùng (`pg_dump --schema-only --schema='*_schema'`) làm tài liệu đối chiếu cho T2 · *plan §4.1*
- [ ] ~~**T2**~~ ⏸️ *hoãn 2026-11-25* Viết `libs/database/src/lib/migrations/000_baseline_schema.sql` (schema, enum, bảng gốc trước migration 001, toàn bộ `IF NOT EXISTS`) · *plan §4.1*
- [ ] ~~**T3**~~ ⏸️ *hoãn 2026-11-25* Viết `tools/db/migrate.mjs`: bảng `public.schema_migrations`, chạy file chưa áp dụng theo thứ tự, mỗi file một transaction, cờ `--baseline-existing`, `--dry-run`; thêm script `npm run db:migrate` · *plan §4.3*
- [ ] ~~**T4**~~ ⏸️ *hoãn 2026-11-25* Kiểm chứng: tạo Supabase project trống → `npm run db:migrate` → khởi động 5 backend service không lỗi · *plan §4.1*

## Phase 1 — Backend

- [x] **T5** `libs/shared-types`: `getJwtSecrets()` + unit test (production thiếu secret → ném lỗi) · *GAP 3*
- [x] **T6** Dùng `getJwtSecrets()` ở `apps/auth-service/src/app/modules/auth/auth.module.ts`, `auth.service.ts`, `apps/api-gateway/src/app/app.module.ts`, `common/strategies/jwt.strategy.ts`, `modules/interaction/interaction.module.ts` · *GAP 3*
- [x] **T7** Migration `014_registration_otp_attempts.sql` + cột `attempts` trong entity `RegistrationOtp` · *GAP 6*
- [x] **T8** `auth.service.ts`: OTP bằng `crypto.randomInt`; `verifyOtpAndRegister` tìm theo email, so hash `timingSafeEqual`, tăng `attempts`, xoá khi đủ 5 · *GAP 5, GAP 6, AC-1.4*
- [x] **T9** `auth.service.ts#forgotPassword`: gửi email liên kết đặt lại qua mailer sẵn có (`APP_URL` từ env); SMTP lỗi chỉ log · *GAP 1, AC-3.2*
- [x] **T10** [P] Gỡ `POST /auth/register` khỏi `apps/api-gateway/src/app/modules/auth/auth.controller.ts`; bỏ `register` khỏi regex trong `redis-rate-limit.middleware.ts` và `web-client/src/lib/api/client.ts` · *GAP 2*
- [x] **T11** Thêm `APP_URL`, `AUTH_DEV_BYPASS`, `E2E_DATABASE_URL` vào `.env.example` kèm chú thích. Đồng thời bổ sung các biến code đang dùng nhưng `.env.example` còn thiếu: `HUGGINGFACE_API_TOKEN`, `GROQ_VISION_MODEL`, `CORS_ORIGIN`, `NEXT_PUBLIC_MAP_TILE_URL`, `*_SERVICE_URL` (có mặc định localhost)

## Phase 2 — Frontend

- [x] **T12** `apps/web-client/src/proxy.ts`: thay nhánh `NODE_ENV === 'development'` bằng cờ `AUTH_DEV_BYPASS`; sửa tên cookie đọc sai · *GAP 4, AC-5.1* — xong 2026-11-25, [log.md](log.md) LOG-001
- [x] **T13** `(auth)/forgot-password/page.tsx`: đọc `?token=` → vào thẳng bước đặt mật khẩu mới · *AC-3.3*
- [x] **T14** [P] Bổ sung `label` / `aria-label` cho input ở trang login, register (gồm 6 ô OTP), forgot-password, profile · *plan §7*

## Phase 2b — Hai GAP do E2E phát hiện (plan §9b)

> Trước khi làm: chuyển LOG-002, LOG-003 trong [log.md](log.md) sang "🟡 Đang sửa". Sau khi test đạt: ghi kết quả vào log + spec §9.

**LOG-002 — chọn vai trò khi đăng ký** · *AC-1.1, AC-1.6*

- [x] **T32** `(auth)/register/page.tsx`: `<fieldset>` "Bạn là" với 2 radio Khách hàng / Chủ quán (`registerField('type')`), đặt trên ô Họ tên, mặc định customer
- [x] **T33** [P] Bước OTP hiển thị "Đăng ký với vai trò: …"
- [x] **T34** `test/e2e/auth/register.spec.ts`: bỏ `test.fail()`, viết lại test chủ quán qua UI → `/dashboard`; thêm test mặc định customer

**LOG-003 — báo riêng tài khoản bị khoá** · *AC-2.3*

- [x] **T35** `libs/shared-types`: `AUTH_ERROR_CODES.ACCOUNT_DISABLED` (web-client giữ bản sao — xem LOG-003)
- [x] **T36** `auth-service/.../auth.service.ts`: `login()` và `refresh()` trả `{ message, error_code: 'ACCOUNT_DISABLED' }`; chú thích giữ thứ tự "so mật khẩu trước, kiểm tra khoá sau"
- [x] **T37** `(auth)/login/page.tsx`: nhánh 401 rẽ theo `error_code`
- [x] **T38** `test/e2e/auth/login.spec.ts`: bỏ `test.fail()` AC-2.3 (UI); thêm kiểm `error_code`; thêm test "tài khoản bị khoá + sai mật khẩu → thông báo chung"

**Kiểm chứng**

- [x] **T39** `nx typecheck auth-service` + `tsc` web-client + bộ test; `npm run e2e` → **35/35 pass, 0 `test.fail()`** (2026-11-25)
- [x] **T40** Ghi kết quả vào LOG-002, LOG-003; gạch 2 GAP ở spec §9

## Phase 3 — Hạ tầng E2E (Playwright)

> Theo yêu cầu người dùng (2026-11-24), bộ test đặt ở **thư mục `test/` ở root** thay cho project `apps/web-client-e2e`. Test viết cho hành vi **hiện tại**; chỗ ứng dụng chưa đạt spec dùng `test.fail()` kèm ghi chú GAP — khi sửa xong GAP thì bỏ `test.fail()`.

- [x] **T15** `test/` + `npx playwright install chromium` (Playwright 1.58.2)
- [x] **T16** `test/playwright.config.ts`: `webServer` build rồi chạy dist auth-service / api-gateway, `nx serve web-client`, `cwd` = root, Redis tắt, `@redis` bị loại trừ mặc định
- [x] **T17** `test/support/db.ts`: dùng `E2E_DATABASE_URL` hoặc `DATABASE_URL`; mọi thao tác ghi bị giới hạn ở email `e2e+…@mynook.test`. *Chưa làm: chặn chạy khi trùng database chính — hiện đang chạy trên database nhóm theo yêu cầu.*
- [x] **T18** `uniqueEmail()`, `createUser()` qua luồng OTP thật; global setup / teardown dọn dữ liệu test
- [x] **T19** `test/support/auth.ts`: đọc `dev_otp` từ phản hồi, `loginViaUi`, `typeOtp`
- [x] **T20** Script `npm run e2e`, `e2e:ui`, `e2e:report`. *Chưa thêm target Nx.*

## Phase 4 — Test E2E (`test/e2e/auth/`)

- [x] **T21** `register.spec.ts` · *AC-1.1–1.6, AC-5.3*. *Chưa có: GAP 2, GAP 6 (chờ Phase 1)*
- [x] **T22** [P] `login.spec.ts` · *AC-2.1, 2.2, 2.3, 2.6*
- [x] **T23** [P] `session.spec.ts` · *AC-2.4, 2.5, FR-3, FR-4*
- [x] **T24** [P] `forgot-password.spec.ts` · *AC-3.1–3.4*
- [x] **T25** [P] `profile.spec.ts` · *AC-4.1–4.3*
- [x] **T26** [P] `rbac.spec.ts` · *AC-5.1, 5.2*
- [x] **T27** [P] NFR-2 rate limit — nằm trong `rbac.spec.ts`, tag `@redis` (chưa chạy)

### Kết quả lần chạy đầu (2026-11-24)

33/33 pass (2,2 phút) — gồm 28 test đạt và 5 test `test.fail()` xác nhận GAP còn tồn tại:

| Test | GAP phát hiện | Bổ sung vào |
|---|---|---|
| Form đăng ký chọn vai trò chủ quán | Form không có ô chọn vai trò (luôn `customer`) | spec 001 §9 — **mới** |
| AC-2.3 (UI) tài khoản bị khoá | Trang login gộp mọi 401 thành "Email hoặc mật khẩu không đúng" | spec 001 §9 — **mới** |
| AC-2.6, AC-5.1 (×2) | `proxy.ts` tắt khi dev **và** đọc sai tên cookie (`access_token`/`user_role` thay vì `mynook_access_token`/`user_type`) | GAP 4 — mở rộng |

## Phase 5 — Kiểm chứng & đóng spec

- [x] **T28** `npm run e2e` pass toàn bộ (mặc định) và `npm run e2e -- --grep @redis` pass khi bật Redis
- [x] **T29** *(typecheck + build ✅; lint: chưa có target)* `npx nx affected -t lint typecheck build` pass
- [x] ~~**T30**~~ *thay bằng E2E qua Mailpit (người dùng yêu cầu kiểm thử bằng script)* Kiểm thử thủ công: đăng ký bằng email thật nhận được OTP qua Gmail SMTP; quên mật khẩu nhận được email có liên kết hoạt động · *GAP 1*
- [x] **T31** Cập nhật [spec.md](spec.md): tick các GAP đã đóng ở mục 9, `updated`; `status: done`; cập nhật [lotrinh.md](../lotrinh.md) và bảng trong [specs/README.md](../README.md)
