---
id: '013'
title: Gắn tag tự động bằng AI
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [search-ai-service, interaction-service, venue-service, api-gateway, web-client]
code:
  - apps/search-ai-service/src/app/modules/review-processing
  - apps/search-ai-service/src/app/modules/description-tagging
  - apps/search-ai-service/src/app/modules/tag
  - apps/search-ai-service/src/app/modules/search/category-tag-provider.service.ts
  - apps/web-client/src/components/home/category-pills.tsx
  - libs/database/src/lib/migrations/010_tags_usage_count_trigger.sql
  - docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md
---

# Spec 013 — Gắn tag tự động bằng AI

> Baseline mô tả hành vi **đang có**. Chi tiết thuật toán ở [docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md](../../docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md) §5.

## 1. Bối cảnh & vấn đề

Đặc điểm thật sự của một quán ("yên tĩnh", "view đẹp", "hợp nhóm", "ồn ào") nằm rải rác trong hàng trăm review và thay đổi theo khung giờ. Điểm trung bình không thể hiện được điều đó. Cần chuyển review (và mô tả quán) thành **tag có điểm, theo khung giờ** để tìm kiếm ([011](../011-hybrid-search/spec.md)) dùng được.

## 2. Mục tiêu

- Mỗi review có nội dung được AI phân tích thành cảm xúc, tag tích cực / tiêu cực và khung giờ.
- Điểm tag của quán tích luỹ theo thời gian, review đã xác thực nặng ký hơn.
- Xoá review thì hoàn tác chính xác phần điểm nó đã đóng góp.
- Quán mới (chưa có review) vẫn có tag khởi đầu từ mô tả.
- Danh sách tag phổ biến luôn phản ánh cộng đồng đang dùng gì.

### Ngoài phạm vi

- Admin sửa / gộp / xoá tag thủ công (xem mục 8).
- Phân tích ảnh trong review.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Hệ thống (dịch vụ AI) | Xử lý sự kiện review / quán |
| Khách | Thấy tóm tắt AI trên review, duyệt theo tag phổ biến |
| Admin | Xử lý bù các review chưa được phân tích |

## 4. User stories

### US-1: Review tự động sinh tag (P1)

- [x] **AC-1.1** — Review có nội dung → AI trả: cảm xúc (tích cực / tiêu cực / trung tính / lẫn lộn), điểm cảm xúc (−1…1), tag tích cực, tag tiêu cực, tag mới đề xuất, khung giờ (sáng / chiều / tối / cả ngày / không rõ). Nội dung được cắt còn 2000 ký tự.
- [x] **AC-1.2** — AI được cung cấp 80 tag phổ biến nhất để ưu tiên tái sử dụng; tag mới chưa tồn tại thì được tạo.
- [x] **AC-1.3** — Mỗi tag tích cực cộng điểm, tiêu cực trừ điểm cho quán ở khung giờ đó (không rõ → cả ngày): ±1, hoặc ±2 nếu là lượt ghé đã xác thực; đồng thời tăng bộ đếm tích cực / tiêu cực.
- [x] **AC-1.4** — Cập nhật điểm tag diễn ra trọn vẹn hoặc không gì cả (giao dịch).
- [x] **AC-1.5** — Kết quả phân tích được lưu lại trên review (hiển thị ở [007](../007-reviews/spec.md) AC-2.4 và dùng để hoàn tác).
- [x] **AC-1.6** — Review không có nội dung → bỏ qua phân tích.

### US-2: Hoàn tác khi xoá review (P1)

- [x] **AC-2.1** — Xoá review → áp đúng phần điểm ngược lại (cùng khung giờ, cùng hệ số), bộ đếm giảm nhưng không âm.
- [x] **AC-2.2** — Tag của quán trở về 0 điểm và 0 lượt → bị xoá, số lượt dùng của tag giảm tương ứng.
- [x] **AC-2.3** — Review chưa từng được phân tích, hoặc tag đã không còn → bỏ qua phần đó.

### US-3: Tag khởi đầu từ mô tả quán (P2)

- [x] **AC-3.1** — Quán được tạo, hoặc mô tả quán thay đổi → AI chọn tag phù hợp từ danh sách tag phổ biến, có xét loại quán.
- [x] **AC-3.2** — Mô tả dưới 10 ký tự → bỏ qua.
- [x] **AC-3.3** — Tag từ mô tả có điểm sàn 0.5 (cả ngày), thấp hơn một review xác thực, để review thật luôn áp đảo lời tự giới thiệu; chạy lại không cộng dồn và không làm giảm điểm review đã đẩy lên.
- [x] **AC-3.4** — Chỉ chấp nhận tag có sẵn trong danh mục; không tạo tag mới từ mô tả.

### US-4: Tag phổ biến (P2)

- [x] **AC-4.1** — Mỗi tag có số lượt dùng (số quán đang có tag), tự cập nhật khi tag được gán / gỡ.
- [x] **AC-4.2** — Trang chủ hiển thị dải tag dạng pill cuộn ngang (có nút cuộn trên màn hình rộng); bấm một tag → tìm kiếm theo tên tag; tag đang tìm được tô sáng; không có tag → ẩn dải.

### US-5: Phân tích bù (P2)

- [x] **AC-5.1** — Có thao tác nội bộ phân tích bù các review có nội dung nhưng chưa được phân tích: theo lô (mặc định 25, tối đa 100), lọc theo quán, chế độ chạy thử.
- [x] **AC-5.2** — Gặp giới hạn tần suất AI → dừng lô, trả về thời gian nên chờ; kết quả gồm số đã quét / đã phân tích / lỗi / còn lại và tối đa 10 lỗi mẫu.

## 5. Yêu cầu chức năng

- **FR-1**: Sự kiện vào: "quán được review", "review bị xoá" (kèm ảnh chụp phân tích), "quán được tạo", "quán được cập nhật mô tả".
- **FR-2**: Xử lý thất bại → sự kiện được đưa lại hàng đợi; thành công → xác nhận.
- **FR-3**: Điểm tag gắn với bộ ba (quán, tag, khung giờ).

## 6. Yêu cầu phi chức năng

- **NFR-1** (chịu lỗi): Hàng đợi không khả dụng → dịch vụ vẫn chạy (chỉ HTTP), review vẫn tạo được; phân tích bù sau.
- **NFR-2** (chi phí): Prompt chỉ chứa tag phổ biến để giảm token.
- **NFR-3** (toàn vẹn): Đầu ra AI được kiểm tra kiểu và giới hạn giá trị trước khi dùng.

## 7. Trường hợp biên

- Sự kiện review bị giao lại hai lần → điểm bị cộng hai lần (xử lý không idempotent).
- Tag AI đề xuất trùng nghĩa với tag sẵn có nhưng khác khoá ("yen_tinh" / "quiet") → tạo thành hai tag riêng.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần trang admin quản lý tag (đổi tên, gộp, ẩn) không?
- [ ] **[CẦN LÀM RÕ]** Có cần cho admin chạy phân tích bù từ giao diện không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP] Quan trọng** — AI lỗi (thiếu khoá, hết hạn mức) khi xử lý sự kiện review → sự kiện bị đưa lại hàng đợi **ngay lập tức, không giới hạn số lần**, có thể tạo vòng lặp gọi AI liên tục. Cần độ trễ / số lần thử tối đa / hàng đợi lỗi.
- [ ] **[GAP]** Tag mới do AI đề xuất được tạo không qua kiểm duyệt — trái với nguyên tắc "AI không phải nguồn sự thật" ([constitution](../constitution.md) §IV.1).
- [ ] **[GAP]** Xử lý review và hoàn tác không idempotent khi sự kiện bị giao lại.
- [ ] **[GAP]** Phân tích bù chỉ gọi được nội bộ, chưa qua gateway / giao diện admin.
- [ ] **[GAP]** Lưu kết quả phân tích lên review qua lời gọi HTTP nội bộ không xác thực; lỗi chỉ được ghi log (tag đã cộng nhưng review không có ảnh chụp → không hoàn tác được khi xoá).
