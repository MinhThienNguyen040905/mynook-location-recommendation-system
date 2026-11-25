---
id: '009'
title: Thông báo
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, auth-service, api-gateway, web-client]
code:
  - apps/interaction-service/src/app/modules/notification
  - apps/interaction-service/src/app/modules/admin
  - apps/api-gateway/src/app/modules/interaction/notification.controller.ts
  - apps/api-gateway/src/app/modules/admin/admin-notification.controller.ts
  - apps/web-client/src/components/shared/notification-dropdown.tsx
  - apps/web-client/src/components/admin/send-notification-modal.tsx
---

# Spec 009 — Thông báo

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Người dùng cần biết khi có điều liên quan tới họ (chào mừng, phản hồi, khuyến mãi, nhắc nhở) mà không phải tự đi kiểm tra. Admin cần kênh gửi thông báo chung tới một nhóm người dùng.

## 2. Mục tiêu

- Chuông thông báo hiển thị số chưa đọc, cập nhật định kỳ.
- Người dùng xem và đánh dấu đã đọc nhanh.
- Admin gửi thông báo theo nhóm người nhận, xem trước trước khi gửi.

### Ngoài phạm vi

- Thông báo đẩy (push) trên trình duyệt / điện thoại, email thông báo.
- Tuỳ chỉnh loại thông báo muốn nhận.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng đã đăng nhập | Nhận và đọc thông báo |
| Admin | Gửi thông báo hàng loạt |
| Hệ thống | Tạo thông báo tự động khi có sự kiện (vd. đăng ký) |

## 4. User stories

### US-1: Nhận thông báo (P1)

**Là** người dùng, **tôi muốn** thấy thông báo mới ở biểu tượng chuông, **để** không bỏ lỡ thông tin.

- [x] **AC-1.1** — Chuông chỉ hiển thị khi đã đăng nhập, có huy hiệu số chưa đọc; số này được làm mới mỗi 30 giây.
- [x] **AC-1.2** — Mở chuông → tải tối đa 50 thông báo gần nhất, mới nhất trước.
- [x] **AC-1.3** — Mỗi thông báo có biểu tượng theo loại (hệ thống, phản hồi review, khuyến mãi, nhắc nhở), tiêu đề, nội dung và thời gian tương đối ("Vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước", sau 7 ngày hiện ngày).
- [x] **AC-1.4** — Bấm ra ngoài thì đóng danh sách.
- [x] **AC-1.5** — Đăng ký tài khoản thành công → nhận thông báo "Chào mừng bạn đến MyNook!" có tên người dùng.

### US-2: Đánh dấu đã đọc (P2)

- [x] **AC-2.1** — Đánh dấu từng thông báo hoặc tất cả là đã đọc; số chưa đọc giảm ngay.
- [x] **AC-2.2** — Người dùng chỉ thao tác được trên thông báo của chính mình.

### US-3: Gửi thông báo hàng loạt (P2)

**Là** admin, **tôi muốn** gửi thông báo tới một nhóm người dùng, **để** truyền đạt tin chung.

- [x] **AC-3.1** — Chọn đối tượng: tất cả, khách hàng, hoặc chủ quán; chọn loại thông báo; nhập tiêu đề (≤ 255 ký tự) và nội dung (≥ 10 ký tự).
- [x] **AC-3.2** — Luồng: soạn → xem trước → gửi → màn hình hoàn tất kèm số người đã nhận.
- [x] **AC-3.3** — Gửi lỗi → toast "Gửi thông báo thất bại. Vui lòng thử lại." và quay lại bước xem trước.
- [x] **AC-3.4** — Chỉ admin truy cập được.

## 5. Yêu cầu chức năng

- **FR-1**: Thông báo có: người nhận, tiêu đề, nội dung, loại, đối tượng liên quan (tuỳ chọn), trạng thái đã đọc, thời điểm tạo.
- **FR-2**: Thông báo chào mừng được tạo khi nhận sự kiện "người dùng đã đăng ký"; xử lý thất bại thì sự kiện được đưa lại hàng đợi để thử lại.
- **FR-3**: Gửi hàng loạt: gateway chuyển đối tượng thành danh sách người nhận, dịch vụ ghi theo lô 500 bản ghi.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chịu lỗi): Lỗi khi tải hoặc đánh dấu thông báo được bỏ qua lặng lẽ, không làm hỏng giao diện.
- **NFR-2** (hiệu năng): Gửi cho hàng nghìn người không vượt giới hạn tham số của cơ sở dữ liệu nhờ chia lô.

## 7. Trường hợp biên

- Sự kiện đăng ký bị gửi lại → có thể tạo hai thông báo chào mừng (không chống trùng).
- Người dùng có hơn 50 thông báo → các thông báo cũ hơn không xem được.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Bấm vào thông báo có cần điều hướng tới đối tượng liên quan (review, quán) không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Loại "phản hồi review" và "nhắc nhở" chưa có nguồn tạo tự động nào — chỉ admin gửi tay (phản hồi review chờ [017](../017-owner-review-response/spec.md)).
- [ ] **[GAP]** Không có thông báo khi review của tôi được bình luận / thích, hoặc khi báo cáo của tôi được xử lý.
- [ ] **[GAP]** Thông báo chào mừng không chống trùng khi sự kiện bị xử lý lại.
- [ ] **[GAP]** Dùng thăm dò định kỳ 30 giây thay vì cơ chế thời gian thực.
