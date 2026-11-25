---
id: '010'
title: Báo cáo vi phạm & kiểm duyệt
status: draft
implementation: partial
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, venue-service, api-gateway, web-client]
code:
  - apps/interaction-service/src/app/modules/report
  - apps/api-gateway/src/app/modules/interaction/report.controller.ts
  - apps/api-gateway/src/app/modules/interaction/venue-report.controller.ts
  - apps/api-gateway/src/app/modules/admin/admin-review.controller.ts
  - apps/api-gateway/src/app/modules/admin/admin-venue-report.controller.ts
  - apps/web-client/src/app/(admin)/admin/reports
---

# Spec 010 — Báo cáo vi phạm & kiểm duyệt

> Baseline mô tả hành vi **đang có**. Backend và trang quản trị đã có; **giao diện báo cáo cho người dùng chưa có** (mục 9).

## 1. Bối cảnh & vấn đề

Nội dung do cộng đồng tạo (review, quán đóng góp) có thể là spam, xúc phạm, sai sự thật, hoặc quán đã đóng cửa / trùng lặp. Không có cơ chế báo cáo và xử lý thì độ tin cậy của toàn bộ nền tảng giảm.

## 2. Mục tiêu

- Người dùng báo cáo review hoặc quán vi phạm, kèm lý do.
- Admin có hàng đợi báo cáo để xử lý: gỡ nội dung hoặc bỏ qua.
- Một nội dung bị nhiều người báo cáo chỉ cần xử lý một lần.

### Ngoài phạm vi

- Tự động kiểm duyệt bằng AI.
- Trừ điểm tin cậy người vi phạm / người báo cáo sai.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng | Báo cáo nội dung vi phạm |
| Admin | Xem, xử lý báo cáo; theo dõi số liệu |

## 4. User stories

### US-1: Báo cáo review (P1)

**Là** người dùng, **tôi muốn** báo cáo một review vi phạm, **để** admin gỡ bỏ.

- [ ] **AC-1.1** — Mỗi review có nút báo cáo; chọn lý do (spam, xúc phạm, giả mạo, khác...) và mô tả tuỳ chọn. *(Chưa có giao diện.)*
- [x] **AC-1.2** — Lý do 2–100 ký tự, mô tả tối đa 2000 ký tự.
- [x] **AC-1.3** — Không thể báo cáo review của chính mình.
- [x] **AC-1.4** — Báo cáo lại một review mà mình đang có báo cáo chờ xử lý → trả về báo cáo cũ, không tạo mới.

### US-2: Báo cáo địa điểm (P1)

- [ ] **AC-2.1** — Trang quán có nút báo cáo với các lý do: giả mạo, sai thông tin, xúc phạm, đã đóng cửa, trùng lặp, khác. *(Chưa có giao diện.)*
- [x] **AC-2.2** — Giới hạn lý do / mô tả và chống trùng như US-1.

### US-3: Xử lý báo cáo (P1)

**Là** admin, **tôi muốn** xem và xử lý báo cáo, **để** giữ nội dung sạch.

- [x] **AC-3.1** — Trang Báo cáo có hai tab: báo cáo review và báo cáo quán; lọc theo trạng thái *Chờ xử lý / Đã xử lý / Bỏ qua*; phân trang, mới nhất trước.
- [x] **AC-3.2** — Xem chi tiết báo cáo kèm nội dung bị báo cáo.
- [x] **AC-3.3** — Review: *Xoá review* → review bị xoá (kèm hoàn tác tag AI), **mọi** báo cáo đang chờ của review đó chuyển "Đã xoá review". *Bỏ qua* → chỉ báo cáo này chuyển "Bỏ qua".
- [x] **AC-3.4** — Quán: *Vô hiệu venue* → quán bị ẩn, **mọi** báo cáo đang chờ của quán chuyển "Đã vô hiệu venue". *Bỏ qua* → chỉ báo cáo này.
- [x] **AC-3.5** — Báo cáo đã xử lý không xử lý lại được; không thể đưa về "Chờ xử lý".
- [x] **AC-3.6** — Ghi nhận admin xử lý và thời điểm xử lý.
- [x] **AC-3.7** — Kết quả xử lý được báo bằng toast.

### US-4: Số liệu báo cáo (P2)

- [x] **AC-4.1** — Dashboard admin hiển thị tổng số, đang chờ, đã gỡ, đã bỏ qua cho từng loại báo cáo.

## 5. Yêu cầu chức năng

- **FR-1**: Báo cáo có: đối tượng (review / quán), người báo cáo, lý do, mô tả, trạng thái, người xử lý, thời điểm xử lý.
- **FR-2**: Trạng thái review: chờ xử lý → đã xoá review | bỏ qua. Trạng thái quán: chờ xử lý → đã vô hiệu venue | bỏ qua.
- **FR-3**: Tạo báo cáo cần đăng nhập; xử lý cần quyền admin.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chống lạm dụng): Gửi báo cáo nằm trong giới hạn 30 lượt / phút chung với review.
- **NFR-2** (nhất quán): Vô hiệu quán và cập nhật báo cáo là hai bước; nếu bước sau lỗi, quán đã bị ẩn nhưng báo cáo vẫn "chờ" (xem mục 9).

## 7. Trường hợp biên

- Review bị xoá bằng đường khác (admin xoá trực tiếp) → các báo cáo chờ của review đó vẫn ở trạng thái chờ, nội dung hiển thị rỗng.
- Báo cáo quán không tồn tại → hiện vẫn tạo được.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có thông báo kết quả xử lý cho người báo cáo không?
- [ ] **[CẦN LÀM RÕ]** Có tự ẩn nội dung khi vượt N báo cáo chờ không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP] Quan trọng** — Chưa có giao diện để người dùng báo cáo review hoặc quán; chỉ có API.
- [ ] **[GAP]** Báo cáo quán không kiểm tra quán tồn tại và không chặn báo cáo quán do chính mình đóng góp.
- [ ] **[GAP]** Xử lý báo cáo quán không nguyên tử (ẩn quán rồi mới cập nhật báo cáo).
- [ ] **[GAP]** Lý do báo cáo là văn bản tự do, chưa có danh sách cố định.
