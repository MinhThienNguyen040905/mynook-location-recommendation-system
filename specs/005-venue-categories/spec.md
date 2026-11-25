---
id: '005'
title: Danh mục loại địa điểm
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, search-ai-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/category
  - apps/api-gateway/src/app/modules/venue/category.controller.ts
  - apps/api-gateway/src/app/modules/admin/admin-category.controller.ts
  - apps/search-ai-service/src/app/modules/search/category-tag-provider.service.ts
  - apps/web-client/src/app/(admin)/admin/categories
  - apps/web-client/src/components/venue/category-picker-chips.tsx
---

# Spec 005 — Danh mục loại địa điểm

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Người dùng nghĩ theo loại quán ("cà phê", "lẩu", "bar") và dùng rất nhiều cách gọi ("cf", "coffee", "caphe"). Cần danh mục loại quán chuẩn để gắn cho quán và để tìm kiếm quy các cách gọi khác nhau về cùng một loại.

## 2. Mục tiêu

- Mỗi quán có một hoặc nhiều loại, trong đó đúng một loại chính để hiển thị.
- Tìm kiếm hiểu được từ đồng nghĩa của loại quán.
- Admin quản lý danh mục mà không cần sửa code.

### Ngoài phạm vi

- Phân cấp loại cha / con.
- Đặc điểm quán (yên tĩnh, view đẹp...) — đó là **tag**, xem [013](../013-ai-tagging/spec.md).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Admin | Thêm / sửa / ẩn loại quán và từ đồng nghĩa |
| Chủ quán / người đóng góp | Chọn loại cho quán |
| Khách | Thấy loại chính trên thẻ quán; tìm theo loại bằng ngôn ngữ tự nhiên |

## 4. User stories

### US-1: Quản lý danh mục (P1)

**Là** admin, **tôi muốn** quản lý danh sách loại quán, **để** phân loại nhất quán.

- [x] **AC-1.1** — Loại quán có: khoá ổn định duy nhất (vd. `cafe`), tên hiển thị, từ đồng nghĩa, mô tả, thứ tự hiển thị, trạng thái.
- [x] **AC-1.2** — Trùng khoá → báo lỗi xung đột. Khoá không đổi được sau khi tạo.
- [x] **AC-1.3** — Xoá loại quán gỡ nó khỏi mọi quán đang dùng.
- [x] **AC-1.4** — Trang quản trị giải thích từ đồng nghĩa được AI dùng để hiểu truy vấn tự do.
- [x] **AC-1.5** — Chỉ admin truy cập được.

### US-2: Gán loại cho quán (P1)

- [x] **AC-2.1** — Khi tạo / sửa quán, chọn nhiều loại bằng dạng chip; loại đầu tiên là loại chính trừ khi chỉ định khác.
- [x] **AC-2.2** — Loại không tồn tại bị bỏ qua lặng lẽ; nếu loại chính được chỉ định không hợp lệ thì loại hợp lệ đầu tiên thành loại chính.
- [x] **AC-2.3** — Mỗi quán có tối đa một loại chính, kể cả khi hai người sửa cùng lúc.

### US-3: Loại quán trong trải nghiệm khách (P1)

- [x] **AC-3.1** — Thẻ quán (trang chủ, kết quả tìm kiếm) hiển thị loại chính dưới dạng nhãn.
- [x] **AC-3.2** — Truy vấn chứa loại quán hoặc từ đồng nghĩa ("quán cf yên tĩnh") được tìm kiếm nhận diện và ưu tiên quán thuộc loại đó (chi tiết ở [011](../011-hybrid-search/spec.md)).
- [x] **AC-3.3** — Danh sách công khai chỉ gồm loại đang hoạt động, sắp theo thứ tự hiển thị rồi tên.

## 5. Yêu cầu chức năng

- **FR-1**: API công khai: danh sách loại đang hoạt động, chi tiết một loại.
- **FR-2**: API quản trị: CRUD, xem cả loại đang ẩn.
- **FR-3**: Thay danh sách loại của quán là thao tác thay thế toàn bộ, thực hiện nguyên tử.

## 6. Yêu cầu phi chức năng

- **NFR-1** (hiệu năng): Dịch vụ tìm kiếm nhớ đệm danh sách loại 5 phút; thay đổi có hiệu lực trong tối đa 5 phút.
- **NFR-2** (toàn vẹn): AI chỉ được trả về khoá loại có trong danh mục; khoá lạ bị loại bỏ.

## 7. Trường hợp biên

- Ẩn một loại đang được nhiều quán dùng → quán vẫn giữ liên kết, nhưng AI tìm kiếm không còn nhận diện loại đó.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần cho khách duyệt quán theo loại (trang / bộ lọc riêng) không? Hiện chỉ có qua tìm kiếm tự nhiên.

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Dải "pill" ở trang chủ hiển thị **tag phổ biến**, không phải loại quán — tên component gây hiểu nhầm. Chưa có cách duyệt theo loại quán.
- [ ] **[GAP]** Dữ liệu đầu vào chưa được validate ở backend (định dạng khoá, độ dài).
