---
id: '007'
title: Đánh giá & bình luận
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, search-ai-service, api-gateway, web-client]
code:
  - apps/interaction-service/src/app/modules/review
  - apps/api-gateway/src/app/modules/interaction/review.controller.ts
  - apps/web-client/src/components/review/write-review-modal.tsx
  - apps/web-client/src/components/venue-detail/venue-reviews.tsx
  - libs/database/src/lib/migrations/013_review_reactions_and_comments.sql
---

# Spec 007 — Đánh giá & bình luận

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Review là nguồn tin cậy chính để khách chọn quán. Đồng thời review là nguyên liệu cho hệ thống: AI rút ra đặc điểm quán ([013](../013-ai-tagging/spec.md)) và review tốt là tín hiệu gợi ý ([012](../012-recommendation/spec.md)). Cộng đồng cần trao đổi quanh review (hỏi thêm, phản biện) và đánh dấu review hữu ích.

## 2. Mục tiêu

- Viết review nhanh, có ảnh, đủ dài để hữu ích.
- Khách thấy review kèm tóm tắt AI (cảm xúc, đặc điểm tích cực / tiêu cực).
- Cộng đồng thảo luận được dưới review và bày tỏ thích / không thích.

### Ngoài phạm vi

- Chủ quán phản hồi review (xem [017](../017-owner-review-response/spec.md)).
- Báo cáo review vi phạm (xem [010](../010-reports-moderation/spec.md)).

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng | Viết review, bình luận, thích / không thích, xem review mình đã viết |
| Khách | Đọc review, xem tóm tắt AI |
| Admin | Xoá review vi phạm |
| Hệ thống AI | Nhận review mới để phân tích |

## 4. User stories

### US-1: Viết review kèm ảnh (P1)

**Là** người dùng, **tôi muốn** chấm sao và viết cảm nhận kèm ảnh, **để** chia sẻ trải nghiệm.

- [x] **AC-1.1** — Bắt buộc chấm 1–5 sao và viết tối thiểu 20 ký tự; nút gửi bị vô hiệu tới khi đủ điều kiện, có bộ đếm ký tự.
- [x] **AC-1.2** — Đính kèm tối đa 5 ảnh / video (tuỳ chọn), xem trước và gỡ được trước khi gửi.
- [x] **AC-1.3** — *When* gửi thành công, *Then* review xuất hiện ngay ở đầu danh sách và được gửi sang AI phân tích ngầm.
- [ ] **AC-1.4** — Chưa đăng nhập thì được mời đăng nhập trước khi mở form. *(Hiện form vẫn mở, lỗi chỉ xuất hiện khi gửi — xem mục 9.)*
- [x] **AC-1.5** — Tối đa 30 lượt gửi review / bình luận / thích / báo cáo mỗi phút cho mỗi người.

### US-2: Đọc review của quán (P1)

**Là** khách, **tôi muốn** đọc review, **để** biết quán thực tế ra sao.

- [x] **AC-2.1** — Review sắp mới nhất trước; mỗi review có tên người viết (họ tên, hoặc phần trước @ của email, hoặc "Người dùng"), ảnh đại diện, số sao, thời gian, nội dung, ảnh.
- [x] **AC-2.2** — Nội dung dài hơn 150 ký tự được rút gọn, bấm để xem thêm.
- [x] **AC-2.3** — Ảnh trong review xem được toàn màn hình, điều hướng bằng phím.
- [x] **AC-2.4** — Review đã được AI phân tích hiện nhãn cảm xúc và các đặc điểm tích cực / tiêu cực; đầu danh sách hiển thị số review đã được AI phân tích.
- [x] **AC-2.5** — Review từ lượt ghé thăm đã xác thực có nhãn riêng.
- [x] **AC-2.6** — Đầu danh sách có khối tóm tắt: điểm trung bình, số sao, tổng số review và biểu đồ phân bố 1–5 sao.
- [x] **AC-2.7** — Tải review lỗi → thông báo lỗi trong khu vực review, trang vẫn hiển thị bình thường.

### US-3: Bình luận & trả lời (P2)

**Là** người dùng, **tôi muốn** bình luận dưới review và trả lời bình luận khác, **để** trao đổi thêm.

- [x] **AC-3.1** — Bình luận 1–1000 ký tự (bỏ khoảng trắng đầu cuối), kèm tối đa 4 ảnh.
- [x] **AC-3.2** — Trả lời lồng nhau nhiều cấp; bình luận cha phải thuộc cùng review, nếu không bị từ chối.
- [x] **AC-3.3** — Bình luận hiển thị theo thứ tự thời gian, cũ trước; có số lượng bình luận trên mỗi review.

### US-4: Thích / không thích review (P2)

- [x] **AC-4.1** — Mỗi người có tối đa một phản hồi trên một review: thích, không thích, hoặc không gì. Chọn lại loại khác sẽ thay thế; bỏ chọn sẽ xoá.
- [x] **AC-4.2** — Review hiển thị số thích, số không thích và phản hồi của chính tôi (nếu đăng nhập).

### US-5: Xem review của tôi (P2)

- [x] **AC-5.1** — Trang hồ sơ liệt kê review tôi đã viết (mặc định 20, tối đa 50), kèm thông tin quán, và tổng số review.

### US-6: Admin xoá review (P1)

- [x] **AC-6.1** — Admin xoá review; bình luận và phản hồi của review bị xoá theo; tag AI đã cộng từ review được hoàn tác ([013](../013-ai-tagging/spec.md)).

## 5. Yêu cầu chức năng

- **FR-1**: Mỗi review mới phát sự kiện "quán được review" (nội dung, số sao, cờ đã xác thực) để AI phân tích.
- **FR-2**: Xoá review phát sự kiện kèm ảnh chụp kết quả AI để hoàn tác tag.
- **FR-3**: Kết quả phân tích AI được lưu lại trên review để hiển thị và để hoàn tác.
- **FR-4**: Xem review là công khai; nếu có đăng nhập thì kèm phản hồi của chính người xem.

## 6. Yêu cầu phi chức năng

- **NFR-1** (chịu lỗi): Hàng đợi sự kiện không khả dụng → review vẫn lưu được, chỉ bỏ qua phân tích AI (có thể phân tích bù sau, xem [013](../013-ai-tagging/spec.md)).
- **NFR-2** (validate): Số sao là số nguyên 1–5; quán phải là mã hợp lệ.

## 7. Trường hợp biên

- Một người viết nhiều review cho cùng một quán → hiện được phép.
- Người viết bị xoá tài khoản → review vẫn còn, hiển thị không có tác giả.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Mỗi người chỉ được một review / quán, hay cho phép nhiều (theo lần ghé)?
- [ ] **[CẦN LÀM RÕ]** "Lượt ghé thăm đã xác thực" được tạo ra bằng cách nào? (Dự kiến từ check-in đặt chỗ — [016](../016-booking/spec.md).)

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP] Quan trọng** — Điểm trung bình và số review của quán **không được cập nhật** khi người dùng viết hoặc admin xoá review (chỉ luồng import Google Maps tính lại). Ảnh hưởng xếp hạng "Đánh giá cao", tìm kiếm và bộ lọc ≥ 4 sao.
- [ ] **[GAP]** Nút "Viết Review" mở form cả khi chưa đăng nhập.
- [ ] **[GAP]** Điểm trong khối tóm tắt được tính từ danh sách review ở giao diện, có thể lệch với điểm của quán hiển thị ở nơi khác.
- [ ] **[GAP]** Người dùng không sửa hay xoá được review / bình luận của chính mình.
- [ ] **[GAP]** Độ dài tối thiểu 20 ký tự chỉ kiểm tra ở giao diện, backend chấp nhận review không có nội dung.
- [ ] **[GAP]** Danh sách review và bình luận không phân trang.
- [ ] **[GAP]** Một số nhãn vẫn bằng tiếng Anh ("Reviews", "min characters", "AI analyzed", "Photos / Videos").
