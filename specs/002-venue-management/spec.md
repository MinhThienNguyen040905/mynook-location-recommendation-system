---
id: '002'
title: Quản lý địa điểm (chủ quán)
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/venue
  - apps/venue-service/src/app/modules/upload
  - apps/api-gateway/src/app/modules/venue
  - apps/web-client/src/app/(owner)
  - apps/web-client/src/components/dashboard/add-venue-modal.tsx
  - apps/web-client/src/components/owner
  - apps/web-client/src/app/(public)/venues/[id]
  - apps/web-client/src/components/venue-detail
  - apps/web-client/src/components/home
---

# Spec 002 — Quản lý địa điểm (chủ quán)

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Chủ quán cần tự đưa quán lên hệ thống và giữ thông tin chính xác (địa chỉ, ảnh, giờ mở cửa, sức chứa). Khách cần trang chi tiết đầy đủ để quyết định có đến hay không. Thông tin quán cũng là đầu vào cho tìm kiếm và gợi ý ([011](../011-hybrid-search/spec.md), [012](../012-recommendation/spec.md)).

## 2. Mục tiêu

- Chủ quán tạo quán mới trong vài phút qua form nhiều bước.
- Thông tin quán thay đổi được phản ánh vào tìm kiếm mà chủ quán không cần làm gì thêm.
- Khách xem được đầy đủ thông tin quán trên một trang.

### Ngoài phạm vi

- Menu (xem [006](../006-menu-management/spec.md)), review ([007](../007-reviews/spec.md)), quán cộng đồng ([003](../003-community-contribution/spec.md)).
- Xác minh chủ quán là chủ thật (giấy phép kinh doanh).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Chủ quán | Tạo, sửa, ẩn quán của mình; xem danh sách quán mình sở hữu |
| Khách | Xem chi tiết quán, danh sách quán ở trang chủ |
| Admin | Quản lý mọi quán (xem [015](../015-admin-console/spec.md)) |

## 4. User stories

### US-1: Tạo địa điểm mới (P1)

**Là** chủ quán, **tôi muốn** tạo quán qua form từng bước, **để** quán xuất hiện trên MyNook.

- [x] **AC-1.1** — Form gồm 4 bước: *Thông tin cơ bản* (tên, chi nhánh, mô tả, ảnh/video, loại quán) → *Vị trí & sức chứa* (địa chỉ, phường, thành phố, quận, ghim trên bản đồ, sức chứa tổng, nhóm tối đa, thân thiện với nhóm) → *Giờ mở cửa* → *Xác nhận*.
- [x] **AC-1.2** — Bắt buộc: tên, mô tả, địa chỉ, thành phố, quận, vị trí trên bản đồ. Danh sách quận lọc theo thành phố đã chọn.
- [x] **AC-1.3** — *When* lưu thành công, *Then* quán hiển thị ngay (đang hoạt động), thuộc sở hữu của tôi, và tự động được đưa vào chỉ mục tìm kiếm ngầm (không làm chậm thao tác lưu).
- [x] **AC-1.4** — Chọn nhiều loại quán; loại đầu tiên là loại chính nếu không chỉ định khác.
- [x] **AC-1.5** — Mặc định nếu không nhập: sức chứa 50, nhóm tối đa 10, mức độ đông "vừa phải".

### US-2: Tải ảnh / video (P1)

- [x] **AC-2.1** — Tải lên tối đa 10 tệp mỗi lần, mỗi tệp ≤ 50 MB, chỉ chấp nhận ảnh hoặc video; tệp khác bị từ chối với thông báo rõ ràng.
- [x] **AC-2.2** — Một người dùng tải lên tối đa 20 lần / 10 phút.

### US-3: Cập nhật thông tin (P1)

**Là** chủ quán, **tôi muốn** sửa thông tin quán, **để** khách luôn thấy thông tin đúng.

- [x] **AC-3.1** — *Given* tôi là chủ quán, *When* sửa bất kỳ trường nào, *Then* chỉ các trường gửi lên bị thay đổi.
- [x] **AC-3.2** — *Given* tôi không phải chủ quán (và quán không phải quán cộng đồng), *When* sửa, *Then* bị từ chối.
- [x] **AC-3.3** — *When* tên, chi nhánh, mô tả hoặc địa chỉ thay đổi, *Then* chỉ mục tìm kiếm của quán được cập nhật lại ngầm; sửa trường khác (giờ mở cửa, sức chứa) không kích hoạt việc này.
- [x] **AC-3.4** — *When* mô tả thay đổi, *Then* tag gợi ý từ mô tả được tính lại (xem [013](../013-ai-tagging/spec.md)).
- [x] **AC-3.5** — Gửi danh sách loại quán rỗng sẽ xoá hết loại quán.

### US-4: Ẩn quán (P2)

- [x] **AC-4.1** — Chủ quán "xoá" quán → quán bị ẩn (không mất dữ liệu), biến mất khỏi danh sách, tìm kiếm và gợi ý. Người không phải chủ bị từ chối.

### US-5: Xem chi tiết quán (P1)

**Là** khách, **tôi muốn** xem đầy đủ thông tin quán, **để** quyết định có đến không.

- [x] **AC-5.1** — Trang chi tiết gồm: tên, khu vực, điểm đánh giá, mức độ đông hiện tại, thư viện ảnh (xem toàn màn hình, điều hướng bằng phím), mô tả, sức chứa / nhóm tối đa / thân thiện nhóm, menu, giờ mở cửa theo từng ngày, bản đồ vị trí, review.
- [x] **AC-5.2** — Quán không tồn tại → trang 404.
- [x] **AC-5.3** — Mở trang → quán được ghi vào "đã xem gần đây" (xem [008](../008-favorites-history/spec.md)).

### US-6: Danh sách quán ở trang chủ (P1)

- [x] **AC-6.1** — Mục *Đánh giá cao* hiển thị tối đa 6 quán có điểm ≥ 4.0, xếp theo điểm có trọng số số review trong 7 ngày gần nhất (quán chỉ có một review 5 sao không vượt được quán đông khách 4.5 sao).
- [x] **AC-6.2** — Mục *Tất cả địa điểm* hiển thị các quán đang hoạt động, mới nhất trước.

### US-7: Danh sách quán của tôi (P1)

- [x] **AC-7.1** — Trang quản lý của chủ quán liệt kê các quán đang hoạt động mà tôi sở hữu, mới nhất trước.

## 5. Yêu cầu chức năng

- **FR-1**: Quán có: tên, chi nhánh, mô tả, địa chỉ đường, phường, thành phố, quận, toạ độ, ảnh/video, sức chứa, nhóm tối đa, thân thiện nhóm, mức độ đông (trống / vừa / đông / kín), giờ mở cửa, ảnh menu, điểm trung bình, số review, trạng thái hoạt động.
- **FR-2**: Vị trí địa lý của quán được tự suy ra từ toạ độ (không nhập tay).
- **FR-3**: Mỗi khi quán được tạo hoặc mô tả thay đổi, hệ thống phát sự kiện để dịch vụ AI gắn tag.
- **FR-4**: Điểm trung bình và số review do hệ thống review cập nhật, chủ quán không sửa được.

## 6. Yêu cầu phi chức năng

- **NFR-1** (hiệu năng): Lưu quán không chờ việc sinh chỉ mục tìm kiếm.
- **NFR-2** (quyền): Kiểm tra quyền sở hữu ở backend.
- **NFR-3** (chịu lỗi): Dịch vụ sinh chỉ mục lỗi → quán vẫn lưu được và vẫn tìm thấy bằng tên/tag; admin có thể tạo lại chỉ mục.

## 7. Trường hợp biên

- Quán bị ẩn vẫn mở được bằng đường dẫn trực tiếp (xem mục 9).
- Toạ độ không khớp với quận/thành phố đã chọn → hiện chưa kiểm tra.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Chủ quán có cần khôi phục quán đã ẩn không, hay chỉ admin?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Chủ quán không có cách cập nhật **mức độ đông** — trường chỉ hiển thị, luôn là giá trị mặc định.
- [ ] **[GAP]** Bất kỳ người dùng đã đăng nhập nào (kể cả khách hàng) đều tạo được quán qua đường dành cho chủ quán; chưa kiểm tra vai trò.
- [ ] **[GAP]** Dữ liệu tạo/sửa quán chưa được validate ở backend (kiểu dữ liệu, bắt buộc, giới hạn độ dài, toạ độ hợp lệ).
- [ ] **[GAP]** Trang chi tiết hiển thị cả quán đã bị ẩn.
- [ ] **[GAP]** Danh sách *Tất cả địa điểm* không phân trang.
- [ ] **[GAP]** Một số nhãn trang chi tiết vẫn bằng tiếng Anh ("About this space", "Opening Hours", "Live Crowd") — trái với [ux-ui.md](../ux-ui.md) §1.
