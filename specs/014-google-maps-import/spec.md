---
id: '014'
title: Import địa điểm từ Google Maps
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [venue-service, interaction-service, search-ai-service, api-gateway, web-client]
code:
  - apps/venue-service/src/app/modules/imports
  - apps/interaction-service/src/app/modules/review/review.service.ts
  - apps/api-gateway/src/app/modules/admin/admin-import.controller.ts
  - apps/web-client/src/app/(admin)/admin/imports
  - tools/google-maps-importer
  - libs/database/src/lib/migrations/012_google_maps_import_pipeline.sql
  - docs/GOOGLE_MAPS_IMPORT_PLAN.md
---

# Spec 014 — Import địa điểm từ Google Maps

> Baseline mô tả hành vi **đang có**. Kế hoạch kỹ thuật gốc ở [docs/GOOGLE_MAPS_IMPORT_PLAN.md](../../docs/GOOGLE_MAPS_IMPORT_PLAN.md).
>
> ⚠️ Tính năng chỉ dành cho **demo / đồ án**: thu thập dữ liệu từ giao diện Google Maps có thể vi phạm điều khoản sử dụng của Google, và review mẫu được gán cho tài khoản ngẫu nhiên. Không dùng cho sản phẩm thật.

## 1. Bối cảnh & vấn đề

Hệ thống mới không có dữ liệu: tìm kiếm, gợi ý và tag AI đều cần quán thật kèm review thật mới thể hiện được giá trị (cold start). Nhập tay từng quán rất chậm; dùng Google Places API thì tốn phí.

## 2. Mục tiêu

- Admin đưa một quán từ trang Google Maps vào MyNook trong vài lần bấm, kèm ảnh, review mẫu và ảnh menu.
- Dữ liệu đi qua bản nháp để admin kiểm tra trước khi xuất bản.
- Quán sau khi xuất bản đi qua **đúng** pipeline như quán thường (chỉ mục tìm kiếm, tag từ mô tả, tag từ review).
- Hạn chế tạo quán trùng.

### Ngoài phạm vi

- Import hàng loạt tự động; người dùng thường tự import.
- Đồng bộ lại khi dữ liệu trên Google Maps thay đổi.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Admin | Thu thập, duyệt, chỉnh, xuất bản hoặc từ chối bản nháp |

## 4. User stories

### US-1: Thu thập quán từ Google Maps (P1)

**Là** admin, **tôi muốn** bấm một nút trên trang Google Maps của quán, **để** tạo bản nháp trong MyNook.

- [x] **AC-1.1** — Công cụ chạy trong trình duyệt (userscript) thêm bảng "MyNook Importer" trên trang quán; cấu hình địa chỉ API và phiên đăng nhập admin.
- [x] **AC-1.2** — Thu thập: tên, mã địa điểm Google, toạ độ, địa chỉ, điện thoại, website, điểm và số review, ảnh quán, review (điểm, tác giả, nội dung, tối đa 3 ảnh / review), ảnh menu.
- [x] **AC-1.3** — Ảnh được tải về và đưa lên kho ảnh của MyNook trước khi tạo bản nháp (không phụ thuộc link Google).
- [x] **AC-1.4** — Gateway cho phép gọi API từ trang Google Maps.

### US-2: Duyệt & chỉnh bản nháp (P1)

- [x] **AC-2.1** — Trang Imports liệt kê bản nháp, lọc theo trạng thái: nháp, đã làm giàu, sẵn sàng, đã xuất bản, đã từ chối, trùng.
- [x] **AC-2.2** — Khi tạo / làm giàu bản nháp, hệ thống tự: nhận diện thành phố / quận từ tên + địa chỉ (theo tên, mã, tên gọi khác), gợi ý tối đa 4 loại quán (theo từ đồng nghĩa), sinh mô tả ngắn nếu không có.
- [x] **AC-2.3** — Admin sửa được mọi trường, chọn review mẫu sẽ đưa vào hệ thống.
- [x] **AC-2.4** — Bản nháp "sẵn sàng" khi có đủ: tên, địa chỉ, thành phố, quận, toạ độ, ít nhất một loại quán.
- [x] **AC-2.5** — Bản nháp đã xuất bản / từ chối không sửa được.
- [x] **AC-2.6** — Trang chi tiết cảnh báo khi không có review mẫu ("venue mới sẽ thiếu cold-start tags").

### US-3: Phát hiện trùng (P1)

- [x] **AC-3.1** — Cùng mã địa điểm Google đã từng import → đánh dấu trùng, độ tin cậy 1.
- [x] **AC-3.2** — Ngược lại, so với các quán đang hoạt động: trùng tên, trùng địa chỉ, cùng khu vực, khoảng cách (≤ 25 m / 75 m / 200 m) → điểm tổng ≥ 0.82 thì đánh dấu trùng kèm quán khớp và lý do.

### US-4: Xuất bản (P1)

- [x] **AC-4.1** — Xuất bản tạo quán **cộng đồng** do admin đóng góp, rồi: sinh chỉ mục tìm kiếm, phát sự kiện gắn tag từ mô tả.
- [x] **AC-4.2** — Review mẫu được tạo thành review nội bộ, gán ngẫu nhiên cho tài khoản đang hoạt động (ưu tiên khách hàng / chủ quán có tên), mỗi review phát sự kiện để AI gắn tag; liên kết với review gốc được lưu để truy vết.
- [x] **AC-4.3** — Có ảnh menu → AI đọc menu và lưu vào quán ([006](../006-menu-management/spec.md)).
- [x] **AC-4.4** — Điểm trung bình và số review của quán được tính lại từ review đã tạo.
- [x] **AC-4.5** — Lỗi ở bước review mẫu / menu / tính điểm không làm hỏng việc xuất bản (chỉ ghi log).
- [x] **AC-4.6** — Xuất bản lại bản nháp đã xuất bản → không tạo quán mới, chỉ tính lại điểm.
- [x] **AC-4.7** — Thiếu trường bắt buộc → từ chối xuất bản.

### US-5: Từ chối (P2)

- [x] **AC-5.1** — Admin từ chối bản nháp → trạng thái "đã từ chối", không tạo gì.

## 5. Yêu cầu chức năng

- **FR-1**: Bản nháp lưu cả dữ liệu thô và dữ liệu đã chuẩn hoá, trạng thái, quán khớp (nếu trùng), độ tin cậy, quán đã xuất bản, người tạo.
- **FR-2**: Mọi thao tác import cần quyền admin.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chi phí): Không dùng API trả phí của Google.
- **NFR-2** (giới hạn): Không thu thập quá ~50 quán / ngày để tránh bị Google chặn.

## 7. Trường hợp biên

- Giao diện Google Maps thay đổi → công cụ thu thập ngừng chạy, cần cập nhật bộ chọn.
- Phiên admin trong công cụ hết hạn → phải đặt lại trong bảng cấu hình.
- Không có tài khoản nào trong hệ thống → không tạo được review mẫu.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cho xuất bản bản nháp đang bị đánh dấu trùng không? (Hiện được phép, chỉ ghi cảnh báo.)

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Xuất bản bản nháp bị đánh dấu trùng vẫn tạo quán mới, không chặn hay hỏi xác nhận.
- [ ] **[GAP]** Phát hiện trùng chỉ so với 200 quán mới nhất và so tên / địa chỉ bằng so khớp chính xác sau chuẩn hoá.
- [ ] **[GAP]** Đường tạo review mẫu ở dịch vụ tương tác là API nội bộ không có xác thực.
- [ ] **[GAP]** Review mẫu gán cho tài khoản thật ngẫu nhiên — người dùng thật sẽ thấy review mình không viết trong hồ sơ.
