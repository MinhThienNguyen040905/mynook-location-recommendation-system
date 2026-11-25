---
id: '017'
title: Chủ quán xem & phản hồi review
status: draft
implementation: none
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, api-gateway, web-client]
code:
  - apps/web-client/src/config/site.ts
  - apps/web-client/src/config/routes.ts
  - apps/web-client/src/app/(owner)/dashboard/page.tsx
  - apps/web-client/src/components/layout/dashboard-sidebar.tsx
---

# Spec 017 — Chủ quán xem & phản hồi review

> **Spec tính năng mới.** Hiện trạng: route `/dashboard/reviews` và mục điều hướng "Đánh giá" đã được khai báo nhưng không có trang; trang tổng quan chủ quán chỉ hiện tổng số review và điểm trung bình. Mọi tiêu chí là đề xuất, cần trả lời mục 8 trước khi chuyển `approved`.

## 1. Bối cảnh & vấn đề

Chủ quán muốn biết khách nói gì về quán mình để cải thiện, và muốn trả lời công khai: cảm ơn review tốt, giải thích hoặc xin lỗi với review xấu. Hiện chủ quán chỉ đọc được review như một khách bình thường, trộn lẫn ở trang chi tiết, và chỉ trả lời được như một bình luận thường không có gì phân biệt.

## 2. Mục tiêu

- Chủ quán xem tập trung review của mọi quán mình sở hữu, lọc được theo quán và số sao.
- Chủ quán trả lời công khai, phản hồi được đánh dấu "Phản hồi từ chủ quán".
- Người viết review được thông báo khi chủ quán phản hồi.

### Ngoài phạm vi

- Chủ quán ẩn / xoá review (chỉ được báo cáo — [010](../010-reports-moderation/spec.md)).
- Phân tích cảm xúc tổng hợp theo thời gian (có thể là spec riêng).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Chủ quán | Theo dõi và phản hồi review |
| Người viết review | Nhận phản hồi từ chủ quán |
| Khách | Thấy quán có quan tâm tới phản hồi |

## 4. User stories

### US-1: Xem review của quán (P1)

**Là** chủ quán, **tôi muốn** xem tất cả review của quán mình ở một chỗ, **để** nắm được phản hồi của khách.

- [ ] **AC-1.1** — Trang "Đánh giá" trong khu quản lý liệt kê review của mọi quán tôi sở hữu, mới nhất trước, có phân trang.
- [ ] **AC-1.2** — Lọc theo quán, theo số sao (1–5), theo "chưa phản hồi".
- [ ] **AC-1.3** — Mỗi review hiển thị kèm tóm tắt AI (cảm xúc, đặc điểm tích cực / tiêu cực) nếu có.
- [ ] **AC-1.4** — Đầu trang tóm tắt: điểm trung bình, phân bố sao, số review chưa phản hồi.

### US-2: Trả lời review (P1)

**Là** chủ quán, **tôi muốn** trả lời công khai một review, **để** thể hiện sự quan tâm.

- [ ] **AC-2.1** — Mỗi review có tối đa một phản hồi chính thức của chủ quán; sửa được, xoá được.
- [ ] **AC-2.2** — Phản hồi hiển thị dưới review ở trang chi tiết quán với nhãn "Phản hồi từ chủ quán", tách biệt với bình luận cộng đồng.
- [ ] **AC-2.3** — Người viết review nhận thông báo loại "phản hồi review" kèm liên kết tới review ([009](../009-notifications/spec.md)).
- [ ] **AC-2.4** — Chỉ chủ của quán được review mới phản hồi được.

## 5. Yêu cầu chức năng

- **FR-1**: Phản hồi chủ quán gồm: review, người phản hồi, nội dung (1–1000 ký tự), thời điểm tạo / sửa.
- **FR-2**: Danh sách review theo chủ quán cần biết danh sách quán của chủ quán (dữ liệu thuộc dịch vụ địa điểm).

## 6. Yêu cầu phi chức năng

- **NFR-1** (quyền): Kiểm tra quyền sở hữu quán ở backend.
- **NFR-2** (chống lạm dụng): Phản hồi nằm trong giới hạn tần suất của nhóm review.

## 7. Trường hợp biên

- Quán cộng đồng → không có chủ quán thật, không áp dụng.
- Review bị xoá → phản hồi bị xoá theo.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Phản hồi chủ quán là bảng riêng hay là bình luận có cờ "chủ quán" (tận dụng bình luận lồng nhau của [007](../007-reviews/spec.md))?
- [ ] **[CẦN LÀM RÕ]** Thanh bên khu quản lý hiện có "Ưu đãi", "Phân tích", "Cài đặt" (chưa có trang) nhưng không có "Đánh giá" — giữ mục nào?

## 9. Hiện trạng

- Route và mục điều hướng "Đánh giá" đã khai báo trong cấu hình nhưng không có trang và không xuất hiện ở thanh bên khu quản lý.
- Thanh bên khu quản lý trỏ tới các trang "Ưu đãi", "Phân tích", "Cài đặt" chưa tồn tại (404).
- Trang tổng quan chủ quán tính tổng review và điểm trung bình từ dữ liệu quán — các số này không được cập nhật khi có review mới ([007](../007-reviews/spec.md) mục 9).
- Loại thông báo "phản hồi review" đã có sẵn nhưng chưa được hệ thống tự tạo.
