---
id: '004'
title: Danh mục địa lý (thành phố / quận)
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, search-ai-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/location
  - apps/api-gateway/src/app/modules/venue/location.controller.ts
  - apps/api-gateway/src/app/modules/admin/admin-location.controller.ts
  - apps/search-ai-service/src/app/modules/search/location-resolver.service.ts
  - apps/web-client/src/app/(admin)/admin/locations
---

# Spec 004 — Danh mục địa lý (thành phố / quận)

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Trước đây địa chỉ quán là chuỗi tự do, nên "Q1", "quận 1", "District 1" bị coi là ba nơi khác nhau và lọc theo khu vực rất kém. Cần một danh mục thành phố / quận chuẩn, có tên gọi khác, để quán gắn vào khu vực rõ ràng và tìm kiếm hiểu được cách người dùng gọi khu vực.

## 2. Mục tiêu

- Mỗi quán thuộc đúng một thành phố và một quận trong danh mục chuẩn.
- Mọi cách gọi phổ biến của một khu vực đều quy về cùng một khu vực khi tìm kiếm.
- Admin tự quản lý danh mục, không cần sửa code.

### Ngoài phạm vi

- Cấp phường / xã (phường vẫn là văn bản tự do của quán).
- Ranh giới hành chính dạng vùng (chỉ lưu điểm trung tâm).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Admin | Thêm / sửa / ẩn thành phố, quận và tên gọi khác |
| Chủ quán / người đóng góp | Chọn thành phố → quận khi tạo quán |
| Khách | Gõ khu vực theo cách quen thuộc khi tìm kiếm |

## 4. User stories

### US-1: Quản lý thành phố & quận (P1)

**Là** admin, **tôi muốn** quản lý danh sách thành phố và quận, **để** dữ liệu địa lý chuẩn hoá.

- [x] **AC-1.1** — Thành phố có: mã ngắn duy nhất (vd. `HCM`), tên, danh sách tên gọi khác, điểm trung tâm (tuỳ chọn), trạng thái hoạt động.
- [x] **AC-1.2** — Quận thuộc một thành phố, có mã duy nhất **trong thành phố đó** (vd. `Q1`), tên, tên gọi khác, điểm trung tâm, trạng thái.
- [x] **AC-1.3** — Tạo trùng mã → báo lỗi xung đột nêu rõ mã bị trùng.
- [x] **AC-1.4** — Mã không đổi được sau khi tạo; tên, tên gọi khác, điểm trung tâm, trạng thái thì sửa được.
- [x] **AC-1.5** — Xoá thành phố xoá luôn các quận của nó.
- [x] **AC-1.6** — Chỉ admin truy cập được các thao tác quản lý.

### US-2: Khai báo tên gọi khác (P1)

- [x] **AC-2.1** — Tên gọi khác được tự chuẩn hoá về chữ thường, bỏ khoảng trắng thừa, bỏ mục rỗng.
- [x] **AC-2.2** — Khi tìm kiếm, khu vực được nhận diện theo thứ tự ưu tiên: trùng tên → trùng tên gọi khác → trùng mã → gần giống tên (chấp nhận lỗi gõ, không phân biệt dấu).
- [x] **AC-2.3** — Quận được nhận diện **trong phạm vi thành phố** đã nhận diện (nếu có), để "Quận 1 Hà Nội" không nhầm sang Quận 1 TP.HCM.

### US-3: Chọn khu vực khi tạo quán (P1)

- [x] **AC-3.1** — Danh sách công khai chỉ gồm khu vực đang hoạt động, sắp theo tên.
- [x] **AC-3.2** — Chọn thành phố trước, danh sách quận được lọc theo thành phố đó.
- [x] **AC-3.3** — Trang quán hiển thị tên quận và thành phố từ danh mục.

## 5. Yêu cầu chức năng

- **FR-1**: API công khai: danh sách / chi tiết thành phố, danh sách quận (lọc theo thành phố) / chi tiết quận.
- **FR-2**: API quản trị: CRUD thành phố và quận, xem cả mục đang ẩn.
- **FR-3**: Khu vực bị ẩn không xuất hiện trong danh sách chọn và không được nhận diện khi tìm kiếm.

## 6. Yêu cầu phi chức năng

- **NFR-1** (hiệu năng): Kết quả nhận diện khu vực khi tìm kiếm được nhớ đệm 10 phút.
- **NFR-2** (quyền): Thao tác quản lý được kiểm tra quyền admin ở gateway.

## 7. Trường hợp biên

- Cùng một tên gọi khác khai báo cho hai quận khác thành phố → nhận diện đúng nếu người dùng nêu thành phố; không nêu thì lấy kết quả đầu tiên.
- Sửa tên gọi khác → có thể mất tới 10 phút để tìm kiếm áp dụng (do nhớ đệm).

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Điểm trung tâm khu vực có được dùng để xếp hạng theo khoảng cách khi người dùng không chia sẻ vị trí không? Hiện chưa dùng.

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Xoá quận / thành phố đang có quán tham chiếu sẽ thất bại với lỗi chung từ cơ sở dữ liệu thay vì thông báo rõ ràng; nên chặn và gợi ý "ẩn" thay vì xoá.
- [ ] **[GAP]** Dữ liệu đầu vào (mã, toạ độ) chưa được validate ở backend.
