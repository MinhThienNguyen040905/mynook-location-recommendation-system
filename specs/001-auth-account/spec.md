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
---

# Spec 001 — Tài khoản & xác thực

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết giữa hành vi mong muốn và hiện trạng.

## 1. Bối cảnh & vấn đề

Người dùng cần tài khoản để viết review, lưu quán, nhận gợi ý và thông báo. Chủ quán cần tài khoản riêng để quản lý quán; admin cần quyền vận hành. Email phải được xác thực để hạn chế tài khoản rác.

## 2. Mục tiêu

- Đăng ký nhanh bằng email, có xác thực quyền sở hữu email.
- Phiên đăng nhập bền (người dùng không phải đăng nhập lại liên tục) nhưng an toàn.
- Phân quyền rõ ràng theo vai trò: khách hàng, chủ quán, quản trị viên.

### Ngoài phạm vi

- Đăng nhập bằng mạng xã hội (Google, Facebook).
- Xác thực hai lớp.
- Xác thực số điện thoại.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Khách (chưa đăng nhập) | Đăng ký nhanh, chọn là khách hàng hay chủ quán |
| Khách hàng / chủ quán | Đăng nhập, khôi phục mật khẩu, cập nhật hồ sơ |
| Admin | Tài khoản bị khoá không thể đăng nhập (xem [015](../015-admin-console/spec.md)) |

## 4. User stories

### US-1: Đăng ký bằng email + OTP (P1)

**Là** khách, **tôi muốn** đăng ký bằng email và mật khẩu, xác thực bằng mã gửi qua email, **để** có tài khoản sử dụng các tính năng cá nhân.

- [x] **AC-1.1** — *Given* email chưa có tài khoản, *When* tôi nhập email, mật khẩu (≥ 6 ký tự), họ tên và chọn vai trò khách hàng hoặc chủ quán, *Then* hệ thống gửi mã 6 chữ số tới email và báo đã gửi.
- [x] **AC-1.2** — *Given* email đã có tài khoản, *When* tôi yêu cầu mã, *Then* hệ thống báo "Email đã được sử dụng" và không gửi mã.
- [x] **AC-1.3** — *Given* tôi đã nhận mã trong vòng 10 phút, *When* tôi nhập đúng mã, *Then* tài khoản được tạo, tôi được đăng nhập ngay và nhận một thông báo chào mừng.
- [x] **AC-1.4** — *Given* mã sai hoặc quá 10 phút, *When* tôi nhập mã, *Then* hệ thống báo "Mã OTP không hợp lệ hoặc đã hết hạn".
- [x] **AC-1.5** — *Given* tôi yêu cầu mã lần nữa, *When* mã mới được gửi, *Then* mã cũ không còn dùng được.
- [x] **AC-1.6** — *Given* đăng ký thành công, *When* vai trò là chủ quán, *Then* tôi được chuyển tới trang quản lý quán; ngược lại về trang chủ. *(Chọn vai trò qua giao diện từ 2026-11-25 — LOG-002.)*

### US-2: Đăng nhập & giữ phiên (P1)

**Là** người dùng, **tôi muốn** đăng nhập bằng email và mật khẩu và giữ phiên trong nhiều ngày, **để** không phải đăng nhập lại liên tục.

- [x] **AC-2.1** — *Given* đúng email và mật khẩu, *When* đăng nhập, *Then* tôi được đăng nhập; chủ quán chuyển tới trang quản lý, khách hàng về trang chủ.
- [x] **AC-2.2** — *Given* sai email hoặc mật khẩu, *When* đăng nhập, *Then* hệ thống báo chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- [x] **AC-2.3** — *Given* tài khoản bị admin khoá, *When* đăng nhập hoặc làm mới phiên, *Then* bị từ chối với thông báo tài khoản đã bị vô hiệu hoá. *(Giao diện đạt từ 2026-11-25 — LOG-003; thông báo chỉ hiện khi mật khẩu đúng, xem AC-2.2.)*
- [x] **AC-2.4** — *Given* phiên ngắn hạn hết hạn khi đang dùng, *When* tôi thao tác, *Then* phiên được làm mới tự động trong suốt, thao tác vẫn thành công.
- [x] **AC-2.5** — *Given* phiên dài hạn (mặc định 7 ngày) cũng hết hạn hoặc không hợp lệ, *When* tôi thao tác, *Then* tôi bị đăng xuất và chuyển tới trang đăng nhập.
- [x] **AC-2.6** — *Given* đã đăng nhập, *When* tôi mở trang đăng nhập / đăng ký, *Then* tôi được chuyển về trang chủ. *(Đạt từ 2026-11-25 — LOG-001; trước đó không đạt ở production.)*

### US-3: Quên & đặt lại mật khẩu (P1)

**Là** người dùng quên mật khẩu, **tôi muốn** đặt lại mật khẩu qua email, **để** lấy lại quyền truy cập.

- [x] **AC-3.1** — *Given* bất kỳ email nào, *When* tôi yêu cầu đặt lại, *Then* hệ thống luôn trả cùng một thông báo trung tính (không lộ email có tồn tại hay không).
- [x] **AC-3.2** — *Given* email tồn tại và đang hoạt động, *When* tôi yêu cầu, *Then* một mã đặt lại có hiệu lực 1 giờ được tạo.
- [x] **AC-3.3** — *Given* mã hợp lệ, *When* tôi đặt mật khẩu mới, *Then* mật khẩu được đổi, mã bị huỷ và tôi được yêu cầu đăng nhập lại.
- [x] **AC-3.4** — *Given* mã sai hoặc hết hạn, *When* tôi đặt lại, *Then* hệ thống báo "Token không hợp lệ hoặc đã hết hạn".

### US-4: Đổi mật khẩu & cập nhật hồ sơ (P2)

**Là** người dùng đã đăng nhập, **tôi muốn** đổi mật khẩu và cập nhật họ tên, số điện thoại, ảnh đại diện, **để** quản lý tài khoản.

- [x] **AC-4.1** — *Given* nhập đúng mật khẩu hiện tại, *When* đổi mật khẩu, *Then* mật khẩu mới có hiệu lực.
- [x] **AC-4.2** — *Given* nhập sai mật khẩu hiện tại, *When* đổi mật khẩu, *Then* bị từ chối "Mật khẩu hiện tại không đúng".
- [x] **AC-4.3** — *When* cập nhật hồ sơ, *Then* chỉ những trường được gửi lên bị thay đổi; email và vai trò không đổi được.

### US-5: Phân quyền theo vai trò (P1)

- [x] **AC-5.1** — Khu vực quản trị chỉ admin vào được; khu vực quản lý quán chỉ chủ quán hoặc admin; trang cá nhân cần đăng nhập. Người không đủ quyền bị chuyển về trang chủ, người chưa đăng nhập bị chuyển tới trang đăng nhập kèm đường dẫn quay lại. *(Đạt từ 2026-11-25 — LOG-001.)*
- [x] **AC-5.2** — Kiểm tra quyền được thực hiện ở backend, không chỉ ở giao diện.
- [x] **AC-5.3** — Người dùng không thể tự đăng ký vai trò admin.

## 5. Yêu cầu chức năng

- **FR-1**: Ba vai trò: `customer`, `owner`, `admin`. Đăng ký chỉ cho chọn `customer` hoặc `owner`.
- **FR-2**: Mỗi tài khoản có điểm tin cậy (mặc định 100) và trạng thái hoạt động.
- **FR-3**: Phiên gồm hai mã: mã truy cập ngắn hạn và mã làm mới dài hạn (mặc định 7 ngày), ký bằng hai khoá khác nhau.
- **FR-4**: Thông tin tài khoản trả về cho client không bao giờ chứa mật khẩu hay mã đặt lại.
- **FR-5**: Tạo tài khoản thành công phát sự kiện "người dùng đã đăng ký" để hệ thống thông báo gửi lời chào.

## 6. Yêu cầu phi chức năng

- **NFR-1** (bảo mật): Mật khẩu băm bằng bcrypt; mã OTP và mã đặt lại chỉ lưu dạng băm SHA-256.
- **NFR-2** (chống lạm dụng): Các thao tác đăng nhập, đăng ký, gửi/xác thực OTP, quên/đặt lại mật khẩu giới hạn 10 lần / 5 phút cho mỗi địa chỉ IP (hoặc mỗi phiên), vượt quá trả lỗi 429 kèm thời gian chờ.
- **NFR-3** (chịu lỗi): Gửi email thất bại không làm hỏng luồng (mã vẫn được tạo); hàng đợi sự kiện không có thì bỏ qua thông báo chào mừng, đăng ký vẫn thành công.
- **NFR-4** (môi trường dev): Ngoài production, mã OTP và mã đặt lại được trả thẳng trong phản hồi để tiện thử nghiệm.

## 7. Trường hợp biên

- Hai người cùng xác thực OTP cho một email gần như đồng thời → người sau nhận "Email đã được sử dụng".
- Tài khoản bị khoá vẫn có phiên hợp lệ → bị chặn ở lần làm mới phiên kế tiếp.
- Nhiều request cùng gặp phiên hết hạn → chỉ làm mới một lần, các request còn lại chờ và dùng phiên mới.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần xác thực email khi đổi email không? (Hiện không cho đổi email.)

## 9. Khoảng trống so với hiện trạng

- [x] **[GAP]** ~~Quên mật khẩu chưa gửi email thật — mã chỉ được ghi log / trả về ở môi trường dev. Production cần gửi liên kết đặt lại qua email.~~ **Đã sửa 2026-11-25** — gửi email chứa liên kết `/forgot-password?token=…`, trang mở thẳng bước đặt mật khẩu mới. E2E qua Mailpit pass. Chi tiết: [log.md](log.md) LOG-004.
- [x] **[GAP]** ~~Vẫn tồn tại đường đăng ký trực tiếp không qua OTP ở backend; cần quyết định gỡ bỏ hay chỉ dành cho nội bộ.~~ **Đã sửa 2026-11-25** — gỡ khỏi gateway (404); auth-service giữ endpoint nội bộ. LOG-004.
- [x] **[GAP]** ~~Khi thiếu cấu hình khoá ký, hệ thống dùng khoá mặc định cố định — production phải bắt buộc cấu hình.~~ **Đã sửa 2026-11-25** — `getJwtSecrets()`: production thiếu hoặc trùng khoá → lỗi khởi động. Test đơn vị pass. LOG-004.
- [x] **[GAP]** ~~Kiểm tra quyền ở giao diện bị tắt hoàn toàn trong môi trường dev. Ngoài ra lớp kiểm tra này đọc sai tên cookie (`access_token`, `user_role`) trong khi ứng dụng ghi `mynook_access_token`, `user_type` → ở production sẽ luôn coi người dùng là chưa đăng nhập.~~ **Đã sửa 2026-11-25** — dùng chung hằng số tên cookie, bỏ qua kiểm tra chỉ khi bật `AUTH_DEV_BYPASS=true`. E2E AC-2.6, AC-5.1 pass. Chi tiết: [log.md](log.md) LOG-001.
- [x] **[GAP]** ~~Form đăng ký không có ô chọn vai trò — chủ quán không tự đăng ký được qua giao diện (AC-1.1, AC-1.6).~~ **Đã sửa 2026-11-25** — nhóm chọn "Bạn là: Khách hàng / Chủ quán". E2E pass. Chi tiết: [log.md](log.md) LOG-002.
- [x] **[GAP]** ~~Trang đăng nhập hiển thị "Email hoặc mật khẩu không đúng" cho cả tài khoản bị khoá (AC-2.3).~~ **Đã sửa 2026-11-25** — API trả thêm `error_code: ACCOUNT_DISABLED`, giao diện báo "Tài khoản của bạn đã bị khoá". E2E pass. Chi tiết: [log.md](log.md) LOG-003.
- [x] **[GAP]** ~~Mã OTP sinh bằng bộ sinh số ngẫu nhiên không dành cho mật mã; nên dùng bộ sinh an toàn.~~ **Đã sửa 2026-11-25** — `crypto.randomInt`. Test đơn vị pass. LOG-004.
- [x] **[GAP]** ~~Không giới hạn số lần nhập sai OTP cho một email (chỉ có giới hạn theo IP).~~ **Đã sửa 2026-11-25** — sai 5 lần → mã bị huỷ (migration 014). E2E pass. LOG-004.

**Tất cả khoảng trống đã đóng (2026-11-25).** Kiểm chứng: `npm run e2e` 41/41, `@redis` 1/1, `npm run test:unit` 12/12.

### Còn lại ngoài phạm vi

- Migration baseline để dựng Supabase mới từ repo (task T1–T4) — **hoãn** theo quyết định người dùng 2026-11-25.
- Các project chưa có target `lint` → chưa kiểm được lint.
- `.env` cục bộ đang trỏ Gmail với thông tin đăng nhập bị từ chối → khi dev nên dùng Mailpit (`SMTP_HOST=localhost`, `SMTP_PORT=1026`).

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
