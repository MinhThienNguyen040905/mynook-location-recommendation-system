---
id: '001'
title: Tài khoản & xác thực
status: done
implementation: done
owner: Huỳnh Anh Quốc
created: 2026-11-24
updated: 2026-11-25
services: [auth-service, api-gateway, interaction-service, web-client]
code:
  - apps/auth-service/src/app/modules/auth
  - apps/api-gateway/src/app/modules/auth
  - apps/api-gateway/src/app/common
  - apps/web-client/src/app/(auth)
  - apps/web-client/src/proxy.ts
  - apps/web-client/src/lib/api/client.ts
  - apps/web-client/src/lib/constants.ts
  - libs/shared-types/src/lib/jwt-secrets.ts
  - libs/database/src/lib/migrations/014_registration_otp_attempts.sql
tests:
  - test/e2e/auth
  - test/unit
---

# Spec 001 — Tài khoản & xác thực

> **Trạng thái 2026-11-25:** phạm vi đã thống nhất **hoàn thành** — 23/23 tiêu chí chấp nhận đạt, 8/8 khoảng trống ban đầu đã đóng, kiểm chứng bằng script (`npm run e2e` 41/41, `@redis` 1/1, `npm run test:unit` 12/12).
> Còn **rủi ro mở** cho giai đoạn chạy thật — xem §11. Lịch sử sửa: [log.md](log.md). Kế hoạch: [plan.md](plan.md) · [tasks.md](tasks.md).

## 1. Bối cảnh & vấn đề

Người dùng cần tài khoản để viết review, lưu quán, nhận gợi ý và thông báo. Chủ quán cần tài khoản riêng để quản lý quán; admin cần quyền vận hành. Email phải được xác thực để hạn chế tài khoản rác.

## 2. Mục tiêu

- Đăng ký nhanh bằng email, có xác thực quyền sở hữu email.
- Phiên đăng nhập bền (người dùng không phải đăng nhập lại liên tục) nhưng an toàn.
- Phân quyền rõ ràng theo vai trò: khách hàng, chủ quán, quản trị viên.

### Ngoài phạm vi

- Đăng nhập bằng mạng xã hội (Google, Facebook) — xem hướng phát triển §10.
- Xác thực hai lớp — xem §10.
- Xác thực số điện thoại.
- Đổi email đăng nhập (xem câu hỏi mở §8).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Khách (chưa đăng nhập) | Đăng ký nhanh, chọn là khách hàng hay chủ quán |
| Khách hàng / chủ quán | Đăng nhập, khôi phục mật khẩu, cập nhật hồ sơ |
| Admin | Tài khoản bị khoá không thể đăng nhập (xem [015](../015-admin-console/spec.md)) |

## 4. User stories

### US-1: Đăng ký bằng email + OTP (P1)

**Là** khách, **tôi muốn** đăng ký bằng email và mật khẩu, xác thực bằng mã gửi qua email, **để** có tài khoản sử dụng các tính năng cá nhân.

- [x] **AC-1.1** — *Given* email chưa có tài khoản, *When* tôi chọn vai trò ("Bạn là: **Khách hàng** / **Chủ quán**", mặc định Khách hàng), nhập họ tên, email, mật khẩu (≥ 6 ký tự), *Then* hệ thống gửi email chứa mã 6 chữ số và chuyển sang bước nhập mã, hiển thị email và vai trò đã chọn.
- [x] **AC-1.2** — *Given* email đã có tài khoản, *When* tôi yêu cầu mã, *Then* hệ thống báo "Email đã được sử dụng" và không gửi mã.
- [x] **AC-1.3** — *Given* tôi đã nhận mã trong vòng 10 phút, *When* tôi nhập đúng mã, *Then* tài khoản được tạo, tôi được đăng nhập ngay và nhận một thông báo chào mừng.
- [x] **AC-1.4** — *Given* mã sai hoặc quá 10 phút, *When* tôi nhập mã, *Then* hệ thống báo mã không hợp lệ / hết hạn và xoá trắng 6 ô nhập.
- [x] **AC-1.5** — *Given* tôi yêu cầu mã lần nữa, *When* mã mới được gửi, *Then* mã cũ không còn dùng được.
- [x] **AC-1.6** — *Given* đăng ký thành công, *When* vai trò là chủ quán, *Then* tôi được chuyển tới trang quản lý quán; ngược lại về trang chủ.
- [x] **AC-1.7** — *Given* tôi đã nhập sai mã **5 lần**, *When* nhập lần nữa (kể cả mã đúng), *Then* bị từ chối "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới"; yêu cầu mã mới thì đăng ký lại bình thường. Sai dưới 5 lần rồi nhập đúng vẫn đăng ký được.

### US-2: Đăng nhập & giữ phiên (P1)

**Là** người dùng, **tôi muốn** đăng nhập bằng email và mật khẩu và giữ phiên trong nhiều ngày, **để** không phải đăng nhập lại liên tục.

- [x] **AC-2.1** — *Given* đúng email và mật khẩu, *When* đăng nhập, *Then* tôi được đăng nhập; chủ quán chuyển tới trang quản lý, khách hàng về trang chủ.
- [x] **AC-2.2** — *Given* sai email hoặc mật khẩu, *When* đăng nhập, *Then* hệ thống báo chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không) — **kể cả khi tài khoản đang bị khoá** mà mật khẩu sai.
- [x] **AC-2.3** — *Given* tài khoản bị admin khoá **và** mật khẩu đúng, *When* đăng nhập hoặc làm mới phiên, *Then* bị từ chối; giao diện báo "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên."
- [x] **AC-2.4** — *Given* phiên ngắn hạn hết hạn khi đang dùng, *When* tôi thao tác, *Then* phiên được làm mới tự động trong suốt, thao tác vẫn thành công.
- [x] **AC-2.5** — *Given* phiên dài hạn (mặc định 7 ngày) cũng hết hạn hoặc không hợp lệ, *When* tôi thao tác, *Then* tôi bị đăng xuất và chuyển tới trang đăng nhập.
- [x] **AC-2.6** — *Given* đã đăng nhập, *When* tôi mở trang đăng nhập / đăng ký, *Then* tôi được chuyển về trang chủ.

### US-3: Quên & đặt lại mật khẩu (P1)

**Là** người dùng quên mật khẩu, **tôi muốn** đặt lại mật khẩu qua email, **để** lấy lại quyền truy cập.

- [x] **AC-3.1** — *Given* bất kỳ email nào, *When* tôi yêu cầu đặt lại, *Then* hệ thống luôn trả cùng một thông báo trung tính (không lộ email có tồn tại hay không); email không tồn tại thì **không có email nào được gửi**.
- [x] **AC-3.2** — *Given* email tồn tại và đang hoạt động, *When* tôi yêu cầu, *Then* tôi nhận email chứa **liên kết đặt lại mật khẩu**, hiệu lực 1 giờ.
- [x] **AC-3.3** — *Given* tôi mở liên kết trong email, *When* trang mở ra, *Then* vào thẳng bước "Mật khẩu mới"; đặt mật khẩu mới xong thì mật khẩu cũ hết hiệu lực, liên kết không dùng lại được, tôi được yêu cầu đăng nhập lại.
- [x] **AC-3.4** — *Given* mã đặt lại sai hoặc hết hạn, *When* tôi đặt lại, *Then* hệ thống báo "Token không hợp lệ hoặc đã hết hạn".

### US-4: Đổi mật khẩu & cập nhật hồ sơ (P2)

**Là** người dùng đã đăng nhập, **tôi muốn** đổi mật khẩu và cập nhật họ tên, số điện thoại, ảnh đại diện, **để** quản lý tài khoản.

- [x] **AC-4.1** — *Given* nhập đúng mật khẩu hiện tại, *When* đổi mật khẩu, *Then* mật khẩu mới có hiệu lực. *(Đạt ở API — **chưa có giao diện**, xem rủi ro R-5 §11.)*
- [x] **AC-4.2** — *Given* nhập sai mật khẩu hiện tại, *When* đổi mật khẩu, *Then* bị từ chối "Mật khẩu hiện tại không đúng".
- [x] **AC-4.3** — *When* cập nhật hồ sơ, *Then* chỉ những trường được gửi lên bị thay đổi; email và vai trò không đổi được.

### US-5: Phân quyền theo vai trò (P1)

- [x] **AC-5.1** — Khu vực quản trị chỉ admin vào được; khu vực quản lý quán chỉ chủ quán hoặc admin; trang cá nhân cần đăng nhập. Người không đủ quyền bị chuyển về trang chủ, người chưa đăng nhập bị chuyển tới trang đăng nhập kèm đường dẫn quay lại. Áp dụng **cả khi chạy dev** (trừ khi bật `AUTH_DEV_BYPASS=true`).
- [x] **AC-5.2** — Kiểm tra quyền được thực hiện ở backend, không chỉ ở giao diện; mã truy cập giả mạo / hỏng bị từ chối.
- [x] **AC-5.3** — Người dùng không thể tự đăng ký vai trò admin; không có đường đăng ký nào bỏ qua OTP.

## 5. Yêu cầu chức năng

- **FR-1**: Ba vai trò: `customer`, `owner`, `admin`. Đăng ký chỉ cho chọn `customer` hoặc `owner`.
- **FR-2**: Mỗi tài khoản có điểm tin cậy (mặc định 100) và trạng thái hoạt động.
- **FR-3**: Phiên gồm hai mã: mã truy cập ngắn hạn (mặc định 15 phút) và mã làm mới dài hạn (mặc định 7 ngày), ký bằng **hai khoá khác nhau**. Cấu hình khoá đọc từ một nguồn duy nhất dùng chung cho auth-service và gateway.
- **FR-4**: Thông tin tài khoản trả về cho client không bao giờ chứa mật khẩu hay mã đặt lại.
- **FR-5**: Tạo tài khoản thành công phát sự kiện "người dùng đã đăng ký" để hệ thống thông báo gửi lời chào.
- **FR-6**: Đăng ký chỉ qua luồng gửi mã → xác thực mã. Gateway không cung cấp đường đăng ký trực tiếp.
- **FR-7**: Lỗi xác thực có thể kèm **mã lỗi máy đọc được** (`error_code`) bên cạnh thông báo; hiện có `ACCOUNT_DISABLED`.
- **FR-8**: Hệ thống gửi 2 loại email: mã OTP đăng ký và liên kết đặt lại mật khẩu (`<APP_URL>/forgot-password?token=…`), qua máy chủ SMTP cấu hình trong môi trường.

## 6. Yêu cầu phi chức năng

- **NFR-1** (bảo mật): Mật khẩu băm bằng bcrypt; mã OTP và mã đặt lại chỉ lưu dạng băm SHA-256; OTP sinh bằng bộ sinh số ngẫu nhiên an toàn mật mã và so khớp với thời gian không phụ thuộc nội dung.
- **NFR-2** (chống lạm dụng): Đăng nhập, gửi / xác thực OTP, quên / đặt lại mật khẩu giới hạn 10 lần / 5 phút cho mỗi địa chỉ IP (hoặc mỗi phiên), vượt quá trả 429 kèm thời gian chờ (cần Redis). Mỗi mã OTP tối đa 5 lần nhập sai.
- **NFR-3** (chịu lỗi): Gửi email thất bại không làm hỏng luồng (mã vẫn được tạo, phản hồi vẫn trung tính); hàng đợi sự kiện không có thì bỏ qua thông báo chào mừng, đăng ký vẫn thành công.
- **NFR-4** (môi trường dev): Ngoài production, mã OTP và mã đặt lại được trả thẳng trong phản hồi và ghi log để tiện thử nghiệm; ở production **không** trả và **không** ghi log các mã này.
- **NFR-5** (cấu hình an toàn): `NODE_ENV=production` mà thiếu khoá ký hoặc hai khoá trùng nhau → service **không khởi động**.
- **NFR-6** (kiểm thử): Mọi tiêu chí chấp nhận có script kiểm chứng trong `test/` (§12); email được kiểm thử qua hộp thư giả Mailpit.

## 7. Trường hợp biên

- Hai người cùng xác thực OTP cho một email gần như đồng thời → người sau nhận "Email đã được sử dụng".
- Tài khoản bị khoá vẫn giữ mã truy cập còn hạn → dùng tiếp được tối đa ~15 phút, bị chặn ở lần làm mới phiên kế tiếp (rủi ro R-4).
- Nhiều request cùng gặp phiên hết hạn → chỉ làm mới một lần, các request còn lại chờ và dùng phiên mới.
- Mở liên kết đặt lại mật khẩu đã dùng / hết hạn → báo lỗi và quay về bước nhập email.
- Redis không chạy → hệ thống vẫn hoạt động nhưng mất giới hạn tần suất theo IP (rủi ro R-6).

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cho phép đổi email đăng nhập không? Nếu có, có cần xác thực email mới không? (Hiện không cho đổi.)

## 9. Khoảng trống ban đầu — đã đóng toàn bộ

| # | Khoảng trống (phát hiện khi viết baseline / chạy E2E) | Sửa | Log |
|---|---|---|---|
| 1 | Kiểm tra quyền trang bị tắt khi dev **và** đọc sai tên cookie → ở production người đã đăng nhập luôn bị đẩy về `/login` | Dùng chung hằng số tên cookie; chỉ bỏ qua khi `AUTH_DEV_BYPASS=true` | LOG-001 |
| 2 | Form đăng ký không chọn được vai trò chủ quán | Nhóm chọn "Bạn là: Khách hàng / Chủ quán" | LOG-002 |
| 3 | Tài khoản bị khoá chỉ thấy "sai mật khẩu" | `error_code: ACCOUNT_DISABLED` + thông báo riêng | LOG-003 |
| 4 | Thiếu khoá ký thì dùng khoá mặc định cố định, kể cả production | `getJwtSecrets()` — fail fast ở production | LOG-004 |
| 5 | Còn đường đăng ký không qua OTP ở gateway | Gỡ khỏi gateway (404) | LOG-004 |
| 6 | OTP sinh bằng `Math.random` | `crypto.randomInt` | LOG-004 |
| 7 | Không giới hạn số lần nhập sai OTP | Tối đa 5 lần (migration 014) | LOG-004 |
| 8 | Quên mật khẩu không gửi email | Email chứa liên kết đặt lại; trang đọc `?token=` | LOG-004 |

Ngoài kế hoạch, cùng LOG-004: OTP và liên kết đặt lại không còn bị ghi log ở production.

## 10. Hướng phát triển — chuyển sang Supabase Auth (tương lai)

> Ghi nhận 2026-11-25 theo yêu cầu người dùng. **Chưa làm** — khi bắt đầu phải tạo **spec mới** (vd `0NN-supabase-auth-migration`) và đánh giá đầy đủ, không sửa thẳng trên spec này.

### Hiện trạng

MyNook **chỉ dùng Supabase làm database Postgres**. Đăng ký / đăng nhập / OTP / quên mật khẩu do `auth-service` tự viết, tài khoản lưu ở `auth_schema.accounts` (18 tài khoản); bảng `auth.users` của Supabase Auth trống. Email gửi bằng `nodemailer` qua SMTP khai báo trong `.env` (Gmail khi chạy thật, Mailpit khi dev / test) — **không đi qua Supabase**.

### So sánh

| | Supabase Auth gửi mail | auth-service tự gửi (hiện tại) |
|---|---|---|
| Cần SMTP riêng | **Vẫn cần** — dịch vụ email mặc định của Supabase chỉ gửi tới thành viên team project, ~2 email / giờ, chỉ để thử nghiệm | Cần |
| Đăng ký / OTP / quên mật khẩu | Có sẵn | Đã tự làm (41 test E2E) |
| Đăng nhập Google / Facebook, xác thực 2 lớp | **Có sẵn** | Chưa có (ngoài phạm vi §2) |
| Vai trò customer / owner / admin, khoá tài khoản, điểm tin cậy | Phải làm thêm (metadata hoặc bảng hồ sơ, tự đồng bộ) | Có sẵn |
| Kiến trúc microservice (gateway tự xác thực JWT) | Gateway phải đổi sang xác thực JWT của Supabase | Đúng thiết kế (constitution §II) |
| Test tự động email | Khó — Supabase cloud không gửi được tới Mailpit cục bộ | Dễ (Mailpit) |
| Phụ thuộc nhà cung cấp | Cao | Thấp |

### Nên bắt đầu khi

- Đồ án cần **đăng nhập bằng Google / Facebook** hoặc **xác thực 2 lớp** (hai mục hiện "ngoài phạm vi" ở §2), **hoặc**
- Nhóm muốn giảm phần code xác thực phải tự bảo trì.

**Không** nên đổi chỉ để "Supabase gửi mail giúp" — vẫn phải cấu hình SMTP riêng, vấn đề email không được giải quyết.

### Khối lượng ước tính (cho spec tương lai)

- Thay `auth-service` bằng gọi Supabase Auth; gateway xác thực JWT do Supabase ký (thay `getJwtSecrets()`).
- Bảng hồ sơ (vai trò, `is_active`, `trust_score`) liên kết `auth.users`; chuyển 18 tài khoản (Supabase nhập được mật khẩu đã băm bcrypt).
- Viết lại các trang đăng ký / đăng nhập / quên mật khẩu ở web-client và cơ chế làm mới phiên.
- Khai báo SMTP riêng (Gmail App Password / Brevo / Resend) trong dashboard Supabase; điều chỉnh giới hạn gửi.
- Viết lại phần lớn 41 test E2E; bỏ hoặc thay cách kiểm thử email bằng Mailpit.

### Nguồn

- [Supabase — Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Supabase — Rate limits](https://supabase.com/docs/guides/auth/rate-limits) · [Supabase — Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

## 11. Rủi ro còn mở (chưa lên kế hoạch)

> Phân tích 2026-11-25. Không thuộc các tiêu chí đã thống nhất ở §4, nhưng ảnh hưởng khi **chạy thật**. Muốn xử lý mục nào → thêm thành khoảng trống / AC mới, cập nhật plan + tasks, ghi log trước khi sửa.

| ID | Mức | Rủi ro | Hậu quả | Hướng xử lý | Công sức |
|---|---|---|---|---|---|
| **R-1** | 🔴 Cao | Hệ thống coi "thiếu `NODE_ENV`" là môi trường dev → trả `dev_otp` / `dev_reset_token` trong phản hồi | Quên cấu hình khi deploy → ai cũng đăng ký bằng email người khác hoặc **chiếm tài khoản** qua quên mật khẩu | Chỉ trả mã khi bật cờ riêng (vd `AUTH_DEV_EXPOSE_CODES=true`), không suy ra từ `NODE_ENV` | Nhỏ |
| **R-2** | 🔴 Cao | Đổi / đặt lại mật khẩu không thu hồi phiên cũ | Kẻ đã lấy được mã làm mới phiên dùng tiếp tới **7 ngày** dù chủ tài khoản đã đổi mật khẩu | Thêm "phiên bản phiên" vào tài khoản, tăng khi đổi mật khẩu, kiểm tra khi làm mới phiên (cần migration) | Vừa |
| **R-3** | 🔴 Cao | Mã phiên lưu trong cookie JavaScript đọc được (không `HttpOnly`) | Trang có lỗi XSS → kẻ tấn công lấy được phiên | Gateway đặt cookie `HttpOnly` + `Secure` + `SameSite`; client không tự đọc mã | Lớn |
| **R-4** | 🟠 TB | Gateway chỉ kiểm tra chữ ký mã truy cập, không kiểm tra trạng thái khoá | Tài khoản bị khoá dùng tiếp tối đa ~15 phút (đã chấp nhận ở §7) | Rút ngắn thời hạn mã truy cập, hoặc kiểm tra trạng thái khoá (có cache) | Vừa |
| **R-5** | 🟠 TB | Chưa có giao diện đổi mật khẩu (API đã có, AC-4.1 chỉ đạt ở API) | Người dùng phải đi đường vòng qua "Quên mật khẩu" | Thêm form đổi mật khẩu ở trang hồ sơ + test E2E | Nhỏ – vừa |
| **R-6** | 🟠 TB | Giới hạn tần suất theo IP phụ thuộc Redis | Redis tắt → không còn chống dò mật khẩu / spam OTP (còn giới hạn 5 lần / mã OTP) | Cảnh báo / health check khi Redis tắt ở production; cân nhắc giới hạn dự phòng trong bộ nhớ | Nhỏ |
| **R-7** | 🟠 TB | Chưa gửi được email thật (App Password Gmail trong `.env` bị từ chối); Gmail giới hạn lượng gửi, dễ vào thư rác | Demo không nhận được OTP / email đặt lại | Cấu hình App Password đúng, hoặc dùng Brevo / Resend — chỉ đổi 4 dòng SMTP | Cấu hình |
| **R-8** | 🟠 TB | Test E2E chạy trên database PRODUCTION của nhóm | Rủi ro dữ liệu khi test lỗi (đã giới hạn chỉ ghi / xoá email `e2e+…@mynook.test`) | Tách project Supabase riêng cho test (`E2E_DATABASE_URL`) | Nhỏ |
| **R-9** | 🟡 Thấp | Không dựng lại được database từ repo (migration baseline T1–T4 đang hoãn) | Project Supabase mất / bị khoá → không tạo lại được bảng gốc | Làm T1–T4 ([tasks.md](tasks.md)) | Vừa |
| **R-10** | 🟡 Thấp | Chưa có CI, chưa có target `lint` | Thay đổi làm hỏng đăng nhập không ai phát hiện ngay | GitHub Actions chạy `test:unit` + `e2e` khi tạo PR | Vừa |
| **R-11** | 🟡 Thấp | `AUTH_DEV_BYPASS=true` lỡ bật ở production | Giao diện trang quản trị lộ ra (dữ liệu vẫn được backend bảo vệ) | Từ chối khởi động web-client nếu bật cờ này khi production | Nhỏ |
| **R-12** | 🟡 Thấp | Chuyển sang Supabase Auth sau này (§10) | Viết lại phần lớn auth + test | Chỉ làm khi cần đăng nhập mạng xã hội / 2 lớp | — |
| **R-13** | 🟡 Thấp | Câu hỏi mở §8 chưa chốt (đổi email) | Người dùng không đổi được email | Nhóm quyết định | — |

**Đề xuất ưu tiên:** R-1 → R-2 → R-5 → R-7 (cấu hình) → sau đó R-3, R-9, R-10.

## 12. Kiểm thử

Chạy: `npm run infra:up` (Mailpit, Redis, RabbitMQ) rồi `npm run test:unit`, `npm run e2e`, `npm run e2e -- --grep @redis` (khi bật Redis). Hướng dẫn: [docs/SETUP_LOCAL.md](../../docs/SETUP_LOCAL.md) §4.

| AC / yêu cầu | Script |
|---|---|
| AC-1.1 – 1.7, AC-5.3, FR-6 | `test/e2e/auth/register.spec.ts` (gồm email OTP qua Mailpit, giới hạn 5 lần, `/api/auth/register` → 404) |
| AC-2.1 – 2.3, AC-2.6 | `test/e2e/auth/login.spec.ts` |
| AC-2.4, 2.5, FR-3, FR-4 | `test/e2e/auth/session.spec.ts` |
| AC-3.1 – 3.4, FR-8 | `test/e2e/auth/forgot-password.spec.ts` (gồm mở liên kết trong email qua Mailpit) |
| AC-4.1 – 4.3 | `test/e2e/auth/profile.spec.ts` |
| AC-5.1, 5.2, NFR-2 (`@redis`) | `test/e2e/auth/rbac.spec.ts` |
| NFR-5, FR-3 (khoá ký) | `test/unit/jwt-secrets.spec.ts` |
| NFR-1, AC-1.7 (OTP) | `test/unit/otp.spec.ts` |

**Kết quả gần nhất (2026-11-25):** unit 12/12 · e2e 41/41 · `@redis` 1/1 · typecheck + build pass.
