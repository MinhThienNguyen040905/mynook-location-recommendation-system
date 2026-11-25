---
id: '016'
title: Đặt chỗ
status: draft
implementation: partial
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, venue-service, api-gateway, web-client]
code:
  - apps/web-client/src/types/booking.ts
  - apps/web-client/src/components/venue-detail/booking-card.tsx
  - apps/web-client/src/config/api.ts
  - apps/web-client/src/config/routes.ts
  - libs/shared-types/src/lib/shared-types.ts
---

# Spec 016 — Đặt chỗ

> **Spec tính năng mới.** Hiện trạng: chỉ có kiểu dữ liệu, trạng thái đặt chỗ dùng chung, đường dẫn API / route khai báo sẵn và một thẻ giao diện tĩnh (chưa gắn vào trang nào). **Chưa có backend.** Mọi tiêu chí dưới đây là đề xuất, cần trả lời mục 8 trước khi chuyển `approved`.

## 1. Bối cảnh & vấn đề

Nhóm đông (5–10 người) hay gặp cảnh tới nơi hết chỗ. Khách muốn giữ chỗ trước và có thể đặt món trước để đỡ chờ giờ cao điểm. Chủ quán muốn biết trước lượng khách để chuẩn bị. Lượt đặt chỗ đã check-in còn là cơ sở cho nhãn "lượt ghé đã xác thực" trên review ([007](../007-reviews/spec.md)), giúp review đáng tin hơn và có trọng số tag gấp đôi ([013](../013-ai-tagging/spec.md)).

## 2. Mục tiêu

- Khách đặt chỗ trong vài bước: ngày, giờ, số người, ghi chú, (tuỳ chọn) món đặt trước.
- Chủ quán xác nhận / từ chối và quản lý lượt đặt trong trang quản lý.
- Check-in tại quán bằng mã, đánh dấu lượt ghé đã xác thực.

### Ngoài phạm vi

- Thanh toán / đặt cọc online.
- Sơ đồ bàn, chọn bàn cụ thể.
- Đặt chỗ cho quán cộng đồng (không có chủ quán xác nhận) — xem câu hỏi mở.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng | Đặt, xem, huỷ lượt đặt; nhận thông báo trạng thái |
| Chủ quán | Xem, xác nhận, từ chối, check-in, hoàn tất lượt đặt |

## 4. User stories

### US-1: Đặt chỗ (P1)

**Là** người dùng, **tôi muốn** đặt chỗ trước, **để** chắc chắn có chỗ khi tới.

- [ ] **AC-1.1** — Trang chi tiết quán có thẻ đặt chỗ: ngày (không trước hôm nay), giờ (trong giờ mở cửa của ngày đó), số người (1 … nhóm tối đa của quán), ghi chú.
- [ ] **AC-1.2** — Tuỳ chọn "đặt món trước": chọn món còn hàng từ menu ([006](../006-menu-management/spec.md)) với số lượng; hiện tổng tiền tạm tính.
- [ ] **AC-1.3** — Gửi thành công → lượt đặt ở trạng thái *chờ xác nhận*, chủ quán nhận thông báo.
- [ ] **AC-1.4** — Chưa đăng nhập → mời đăng nhập, quay lại đúng quán sau khi đăng nhập.
- [ ] **AC-1.5** — Giao diện bằng tiếng Việt.

### US-2: Xác nhận / từ chối (P1)

**Là** chủ quán, **tôi muốn** xử lý lượt đặt, **để** chủ động phục vụ.

- [ ] **AC-2.1** — Trang "Đặt chỗ" trong khu quản lý liệt kê lượt đặt của quán mình, lọc theo ngày và trạng thái.
- [ ] **AC-2.2** — *Chờ xác nhận* → *Đã xác nhận* (sinh mã check-in) hoặc *Bị từ chối* (kèm lý do tuỳ chọn).
- [ ] **AC-2.3** — Khách nhận thông báo khi trạng thái thay đổi ([009](../009-notifications/spec.md)).
- [ ] **AC-2.4** — Chủ quán chỉ thấy và xử lý lượt đặt của quán mình.

### US-3: Xem & huỷ lượt đặt (P1)

- [ ] **AC-3.1** — Trang "Đặt chỗ" của người dùng liệt kê lượt đặt sắp tới và đã qua, có mã check-in khi đã xác nhận.
- [ ] **AC-3.2** — Huỷ được khi đang *chờ xác nhận* hoặc *đã xác nhận* và trước giờ hẹn; chủ quán nhận thông báo.

### US-4: Check-in tại quán (P2)

- [ ] **AC-4.1** — Chủ quán nhập / quét mã check-in → lượt đặt chuyển *Hoàn tất*.
- [ ] **AC-4.2** — Review của người dùng cho quán này sau khi hoàn tất được đánh dấu "lượt ghé đã xác thực".

## 5. Yêu cầu chức năng

- **FR-1**: Trạng thái: chờ xác nhận → đã xác nhận → hoàn tất; chờ xác nhận / đã xác nhận → đã huỷ (bởi khách); chờ xác nhận → bị từ chối (bởi chủ quán).
- **FR-2**: Lượt đặt lưu: quán, người đặt, ngày, giờ, số người, ghi chú, mã check-in, các món đặt trước (tên, số lượng, giá tại thời điểm đặt).
- **FR-3**: Thay đổi trạng thái phát sự kiện để tạo thông báo.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chống lạm dụng): Giới hạn số lượt đặt đang chờ của một người.
- **NFR-2** (bảo mật): Mã check-in không đoán được.

## 7. Trường hợp biên

- Quán bị ẩn khi còn lượt đặt sắp tới.
- Giá món thay đổi sau khi đặt → giữ giá tại thời điểm đặt.
- Khách không tới → hiện không có trạng thái "vắng mặt".

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Đặt chỗ thuộc dịch vụ nào: dịch vụ tương tác hay một dịch vụ mới?
- [ ] **[CẦN LÀM RÕ]** Có giới hạn sức chứa theo khung giờ (tự từ chối khi kín) không?
- [ ] **[CẦN LÀM RÕ]** Quán cộng đồng có nhận đặt chỗ không?
- [ ] **[CẦN LÀM RÕ]** Có cần trạng thái "vắng mặt" để chấm điểm tin cậy người dùng không?
- [ ] **[CẦN LÀM RÕ]** Chủ quán có cần cập nhật "mức độ đông" cùng trang này không? (Đường dẫn API đã được khai báo — xem [002](../002-venue-management/spec.md) mục 9.)

## 9. Hiện trạng

- Kiểu dữ liệu lượt đặt và món đặt trước đã có ở frontend; trạng thái đặt chỗ đã có trong thư viện dùng chung.
- Đường dẫn API cho người dùng và chủ quán đã khai báo, backend chưa có.
- Route và mục điều hướng "Đặt chỗ" cho người dùng / chủ quán đã khai báo nhưng chưa có trang (dẫn tới 404).
- Thẻ đặt chỗ là bản mẫu tĩnh bằng tiếng Anh, chưa gắn vào trang chi tiết quán. Trang hồ sơ chủ quán hiển thị chỉ số "Active Bookings" không có nguồn dữ liệu.
