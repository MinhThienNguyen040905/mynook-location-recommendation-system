---
id: '003'
title: Đóng góp địa điểm từ cộng đồng
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/venue/venue.service.ts
  - apps/web-client/src/components/venue/contribute-venue-modal.tsx
  - apps/web-client/src/components/venue-detail/community-edit-banner.tsx
  - apps/web-client/src/components/venue-detail/venue-menu-section.tsx
---

# Spec 003 — Đóng góp địa điểm từ cộng đồng

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Phần lớn quán chưa có chủ quán đăng ký trên MyNook. Để dữ liệu phủ rộng, người dùng thường được thêm quán họ biết, và cộng đồng cùng giữ thông tin đúng — theo mô hình wiki.

## 2. Mục tiêu

- Bất kỳ người dùng đã đăng nhập nào cũng thêm được quán mới.
- Quán cộng đồng được đánh dấu rõ ràng để khách biết nguồn thông tin.
- Cộng đồng sửa được thông tin sai mà không cần chờ chủ quán.

### Ngoài phạm vi

- Chủ quán thật nhận quản lý quán cộng đồng (xem câu hỏi mở).
- Lịch sử chỉnh sửa / hoàn tác phiên bản.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng (customer / owner) | Thêm quán, sửa thông tin quán cộng đồng, xem các quán mình đã đóng góp |
| Khách | Biết quán do cộng đồng đóng góp |
| Admin | Ẩn / xoá quán đóng góp sai qua báo cáo ([010](../010-reports-moderation/spec.md)) |

## 4. User stories

### US-1: Thêm quán mới (P1)

**Là** người dùng, **tôi muốn** thêm một quán chưa có trên hệ thống, **để** người khác cũng tìm thấy.

- [x] **AC-1.1** — Form đóng góp gọn hơn form chủ quán ([002](../002-venue-management/spec.md) US-1), trên một màn hình: tên*, mô tả, ảnh (tuỳ chọn), loại quán, địa chỉ*, phường, thành phố*, quận*, ghim bản đồ, giờ mở / đóng cửa, sức chứa, nhóm tối đa, thân thiện nhóm. Không có tên chi nhánh; mô tả không bắt buộc.
- [x] **AC-1.2** — *When* lưu, *Then* quán được đánh dấu "do cộng đồng đóng góp", ghi nhận tôi là người đóng góp, hiển thị ngay và được đưa vào chỉ mục tìm kiếm.
- [x] **AC-1.3** — Cả khách hàng và chủ quán đều dùng được chức năng này.

### US-2: Nhận biết & sửa quán cộng đồng (P1)

**Là** người dùng, **tôi muốn** sửa thông tin sai của quán cộng đồng, **để** dữ liệu luôn đúng.

- [x] **AC-2.1** — Trang chi tiết quán cộng đồng hiển thị biểu ngữ "Địa điểm do cộng đồng đóng góp — ai cũng có thể cập nhật thông tin".
- [x] **AC-2.2** — *Given* đã đăng nhập, *When* bấm "Chỉnh sửa", *Then* tôi sửa nhanh được tên, địa chỉ đường và mô tả ngay trên trang; tên và địa chỉ không được để trống.
- [x] **AC-2.3** — Đổi quận / thành phố phải dùng form chỉnh sửa đầy đủ.
- [x] **AC-2.4** — Chưa đăng nhập thì không thấy nút chỉnh sửa.
- [x] **AC-2.5** — Lưu thành công hiện xác nhận "Đã cập nhật thành công!" trong 3 giây.

### US-3: Đóng góp menu cho quán cộng đồng (P2)

- [x] **AC-3.1** — Phần menu của quán cộng đồng cho phép người dùng đã đăng nhập đóng góp (xem [006](../006-menu-management/spec.md)).

### US-4: Xem quán mình đã đóng góp (P2)

- [x] **AC-4.1** — Người dùng xem được danh sách các quán đang hoạt động mình đã đóng góp, mới nhất trước.

## 5. Yêu cầu chức năng

- **FR-1**: Quán cộng đồng có cờ "đóng góp từ cộng đồng" và người đóng góp; người đóng góp đồng thời là chủ sở hữu kỹ thuật.
- **FR-2**: Quán cộng đồng: mọi người dùng đã đăng nhập đều được cập nhật. Quán thường: chỉ chủ quán.
- **FR-3**: Chỉ người đóng góp (chủ sở hữu kỹ thuật) hoặc admin được ẩn quán cộng đồng.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chống lạm dụng): Quán đóng góp sai được xử lý qua báo cáo vi phạm ([010](../010-reports-moderation/spec.md)).
- **NFR-2** (chịu lỗi): Giống [002](../002-venue-management/spec.md) NFR-3.

## 7. Trường hợp biên

- Hai người sửa cùng lúc → người lưu sau ghi đè (không có cảnh báo xung đột).
- Người dùng thêm quán đã tồn tại → hiện không phát hiện trùng.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Chủ quán thật có được "nhận quản lý" (claim) quán do cộng đồng tạo không? Hiện code chưa có chức năng này.
- [ ] **[CẦN LÀM RÕ]** Có cần admin duyệt quán cộng đồng trước khi hiển thị không? Hiện hiển thị ngay.

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Người sửa quán cộng đồng có thể sửa **mọi trường** qua API (ảnh, toạ độ, loại quán...), không chỉ 3 trường trên giao diện.
- [ ] **[GAP]** Không lưu ai đã sửa gì và khi nào — không truy vết được phá hoại.
- [ ] **[GAP]** Không phát hiện quán trùng khi đóng góp (import Google Maps có phát hiện trùng, xem [014](../014-google-maps-import/spec.md)).
