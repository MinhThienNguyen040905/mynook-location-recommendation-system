---
id: '015'
title: Bảng điều khiển quản trị
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [auth-service, venue-service, interaction-service, api-gateway, web-client]
code:
  - apps/api-gateway/src/app/modules/admin
  - apps/api-gateway/src/app/common/guards/admin.guard.ts
  - apps/auth-service/src/app/modules/admin
  - apps/venue-service/src/app/modules/admin
  - apps/interaction-service/src/app/modules/admin
  - apps/web-client/src/app/(admin)
  - apps/web-client/src/components/layout/admin-sidebar.tsx
---

# Spec 015 — Bảng điều khiển quản trị

> Baseline mô tả hành vi **đang có**. Các trang quản trị chuyên biệt có spec riêng: danh mục địa lý ([004](../004-location-taxonomy/spec.md)), loại quán ([005](../005-venue-categories/spec.md)), thông báo ([009](../009-notifications/spec.md)), báo cáo ([010](../010-reports-moderation/spec.md)), import ([014](../014-google-maps-import/spec.md)).

## 1. Bối cảnh & vấn đề

Admin cần một nơi để nắm tình trạng toàn hệ thống (người dùng, quán, review, báo cáo) và xử lý nhanh người dùng hoặc quán có vấn đề, mà không phải truy cập trực tiếp cơ sở dữ liệu.

## 2. Mục tiêu

- Tổng quan số liệu từ mọi dịch vụ trên một màn hình.
- Khoá / mở khoá tài khoản.
- Ẩn, khôi phục, xoá vĩnh viễn quán.

### Ngoài phạm vi

- Phân quyền admin nhiều cấp.
- Nhật ký thao tác của admin.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Admin | Theo dõi và quản lý toàn hệ thống |

## 4. User stories

### US-1: Xem số liệu tổng quan (P1)

**Là** admin, **tôi muốn** thấy số liệu chính, **để** biết hệ thống đang ra sao.

- [x] **AC-1.1** — Tài khoản: tổng, theo vai trò (khách hàng / chủ quán / admin), đang hoạt động / bị khoá, đăng ký mới trong 30 ngày.
- [x] **AC-1.2** — Quán: tổng, đang hoạt động, bị ẩn, do cộng đồng đóng góp; top 10 quán nhiều review nhất; top 10 khu vực nhiều quán nhất (kèm điểm trung bình).
- [ ] **AC-1.3** — Tương tác: tổng review, review trong 30 ngày, tổng lượt yêu thích, điểm trung bình toàn hệ thống. *(Hai chỉ số "review 30 ngày" và "điểm trung bình" hiện luôn trống — xem mục 9.)*
- [x] **AC-1.4** — Báo cáo: số liệu báo cáo review và báo cáo quán ([010](../010-reports-moderation/spec.md) US-4).
- [x] **AC-1.5** — Số liệu được lấy song song từ các dịch vụ; một dịch vụ lỗi chỉ làm mục đó báo lỗi, các mục khác vẫn hiển thị.

### US-2: Quản lý người dùng (P1)

- [x] **AC-2.1** — Danh sách tài khoản mới nhất trước, phân trang (mặc định 20, tối đa 100), tìm theo email / họ tên, lọc theo vai trò và trạng thái.
- [x] **AC-2.2** — Khoá / mở khoá tài khoản sau khi xác nhận; tài khoản bị khoá không đăng nhập hoặc làm mới phiên được ([001](../001-auth-account/spec.md) AC-2.3).
- [x] **AC-2.3** — Không thể khoá tài khoản admin từ giao diện.
- [x] **AC-2.4** — Tải danh sách lỗi → thông báo kiểm tra gateway và quyền admin.

### US-3: Quản lý địa điểm (P1)

- [x] **AC-3.1** — Danh sách quán theo tab đang hoạt động / bị ẩn, tìm theo tên, phân trang; nhãn "cộng đồng" và "đã ẩn".
- [x] **AC-3.2** — Xem nhanh quán: ảnh, tên, chi nhánh, địa chỉ, mô tả, điểm và số review, sức chứa, nhóm tối đa, mức độ đông, toạ độ.
- [x] **AC-3.3** — Ẩn quán, khôi phục quán, hoặc xoá vĩnh viễn — mỗi thao tác cần xác nhận.
- [x] **AC-3.4** — API hỗ trợ admin tạo / sửa bất kỳ quán nào (luôn cập nhật lại chỉ mục tìm kiếm), lọc theo thành phố / quận / cộng đồng, thống kê theo thành phố.
- [x] **AC-3.5** — API tạo lại chỉ mục ngữ nghĩa cho quán còn thiếu (hoặc tất cả nếu bắt buộc), tối đa 200 quán / lần, trả số thành công / lỗi.

### US-4: Truy cập (P1)

- [x] **AC-4.1** — Mọi trang và API quản trị chỉ dành cho admin, kiểm tra ở gateway.
- [x] **AC-4.2** — Thanh bên quản trị gồm: Dashboard, Người dùng, Địa điểm, Báo cáo, Danh mục, Khu vực, Imports.

## 5. Yêu cầu chức năng

- **FR-1**: Dashboard tổng hợp tại gateway từ 5 nguồn thống kê; trả kèm thời điểm tạo.
- **FR-2**: Xoá vĩnh viễn quán xoá luôn liên kết loại quán; bản nháp import trỏ tới quán được gỡ liên kết.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chịu lỗi): Dashboard không lỗi toàn trang khi một dịch vụ ngừng.
- **NFR-2** (bảo mật): Thông tin tài khoản trả cho admin không chứa mật khẩu / mã đặt lại.

## 7. Trường hợp biên

- Xoá vĩnh viễn quán đã có review / yêu thích → dữ liệu tương tác của quán đó bị mồ côi (khác cơ sở dữ liệu logic, không có ràng buộc).
- Admin tự khoá chính mình qua API → bị khoá ngoài.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần ghi nhật ký thao tác admin (ai khoá ai, ai xoá quán nào) không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Dashboard đọc sai tên trường cho "review 30 ngày" và "điểm trung bình" → luôn trống.
- [ ] **[GAP]** Tạo lại chỉ mục ngữ nghĩa, admin tạo / sửa quán đã có API và hàm gọi ở giao diện nhưng chưa có nút nào sử dụng.
- [ ] **[GAP]** Chặn khoá tài khoản admin chỉ ở giao diện, API vẫn cho phép.
- [ ] **[GAP]** Xoá vĩnh viễn quán không dọn review, yêu thích, lượt xem, tag liên quan.
- [ ] **[GAP]** Nhiều nhãn trộn tiếng Anh ("Customer", "Owner", "Favorites", "Review reports").
