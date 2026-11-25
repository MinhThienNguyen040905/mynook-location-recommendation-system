---
id: '006'
title: Quản lý menu
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/menu
  - apps/api-gateway/src/app/modules/venue/menu.controller.ts
  - apps/web-client/src/app/(owner)/dashboard/menu
  - apps/web-client/src/components/owner/menu-management.tsx
  - apps/web-client/src/components/venue-detail/venue-menu-section.tsx
---

# Spec 006 — Quản lý menu

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Khách muốn biết quán bán gì và giá bao nhiêu trước khi đến. Chủ quán nhỏ ngại nhập tay hàng chục món. Chụp ảnh menu giấy rồi để AI đọc giúp giảm công nhập liệu từ hàng chục phút xuống vài phút.

## 2. Mục tiêu

- Menu có cấu trúc (nhóm món → món, giá, còn / hết) hiển thị trên trang quán.
- Chủ quán tạo menu từ một ảnh chụp, kiểm tra và chỉnh trước khi lưu.
- Quán cộng đồng cũng có menu nhờ người dùng đóng góp.

### Ngoài phạm vi

- Đặt món / thanh toán (đặt món trước thuộc [016](../016-booking/spec.md)).
- Nhiều mức giá / tuỳ chọn size cho một món.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Chủ quán | Tạo và cập nhật menu cho quán mình |
| Người dùng | Đóng góp menu cho quán cộng đồng |
| Khách | Xem menu, ảnh menu gốc |

## 4. User stories

### US-1: Nhập menu thủ công (P1)

**Là** chủ quán, **tôi muốn** tạo nhóm món và món, **để** khách xem được menu.

- [x] **AC-1.1** — Nhóm món có tên và thứ tự hiển thị; món có tên, giá, ảnh (tuỳ chọn), trạng thái còn / hết.
- [x] **AC-1.2** — Thêm, sửa, xoá nhóm món và món. Xoá nhóm món xoá luôn các món trong nhóm.
- [x] **AC-1.3** — Chỉ chủ quán sửa được menu quán của mình; người khác bị từ chối.

### US-2: Nhập menu từ ảnh (P1)

**Là** chủ quán, **tôi muốn** chụp ảnh menu để hệ thống tự đọc, **để** không phải nhập tay.

- [x] **AC-2.1** — Luồng: tải ảnh lên → bấm phân tích → xem kết quả nhóm món / món / giá → sửa tên, giá, xoá món hoặc nhóm → xác nhận lưu.
- [x] **AC-2.2** — Giá được hiểu là VND, dạng số; món không thấy giá có giá 0. Menu không có nhóm rõ ràng được gom vào nhóm "Menu". Giữ nguyên tiếng Việt.
- [x] **AC-2.3** — Lưu kết quả **thêm** các nhóm món mới vào cuối menu hiện có (không xoá menu cũ) và lưu ảnh gốc làm ảnh menu của quán.
- [x] **AC-2.4** — Phân tích thất bại hoặc ảnh không đọc được → thông báo "Phân tích ảnh thất bại. Vui lòng thử với ảnh rõ hơn.", không lưu gì.
- [x] **AC-2.5** — Xoá hết món trong một nhóm ở bước xem trước sẽ bỏ luôn nhóm đó.

### US-3: Đóng góp menu cho quán cộng đồng (P2)

- [x] **AC-3.1** — Quán cộng đồng: mọi người dùng đã đăng nhập đều sửa menu ngay trên trang chi tiết quán (thủ công hoặc từ ảnh), như chủ quán.
- [x] **AC-3.2** — Chưa đăng nhập thì thấy lời mời đăng nhập để đóng góp.
- [x] **AC-3.3** — Quán thường: trang chi tiết chỉ hiển thị menu, chủ quán sửa trong trang quản lý.

### US-4: Xem menu (P1)

**Là** khách, **tôi muốn** xem menu và giá, **để** biết quán có hợp túi tiền không.

- [x] **AC-4.1** — Menu hiển thị theo nhóm, theo thứ tự hiển thị; món hết hàng được đánh dấu.
- [x] **AC-4.2** — Ảnh menu gốc xem được toàn màn hình.
- [x] **AC-4.3** — Quán thường không có menu và không có ảnh menu → ẩn hẳn phần menu.

## 5. Yêu cầu chức năng

- **FR-1**: Xem menu là công khai; mọi thao tác sửa cần đăng nhập.
- **FR-2**: Quyền sửa: chủ quán với quán thường; mọi người dùng đã đăng nhập với quán cộng đồng.
- **FR-3**: Phân tích ảnh dùng mô hình AI đọc ảnh, thời gian chờ tối đa 60 giây.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chịu lỗi): AI lỗi hoặc thiếu cấu hình → báo lỗi rõ ràng, nhập thủ công vẫn hoạt động.
- **NFR-2** (toàn vẹn): Kết quả AI được làm sạch (tên rỗng → "Menu", giá không hợp lệ → 0) trước khi trả về.

## 7. Trường hợp biên

- Phân tích cùng một ảnh hai lần rồi lưu cả hai → menu bị trùng nhóm (không phát hiện trùng).
- Menu nhiều trang → phải phân tích và lưu từng ảnh.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Lưu menu từ ảnh nên **thay thế** hay **thêm vào** menu hiện có? Hiện là thêm vào.

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Phân tích ảnh menu không kiểm tra quyền với quán — bất kỳ người dùng đăng nhập nào cũng gọi được (tốn hạn mức AI).
- [ ] **[GAP]** Lưu hàng loạt không chạy trong một giao dịch — lỗi giữa chừng để lại menu dở dang.
- [ ] **[GAP]** Giá chưa được validate (có thể âm) ở backend.
- [ ] **[GAP]** Phân tích ảnh không có giới hạn tần suất riêng.
