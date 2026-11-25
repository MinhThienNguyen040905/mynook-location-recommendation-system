---
id: '011'
title: Tìm kiếm thông minh (hybrid AI)
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [search-ai-service, api-gateway, web-client]
code:
  - apps/search-ai-service/src/app/modules/search
  - apps/api-gateway/src/app/modules/search/search.controller.ts
  - apps/web-client/src/app/(public)/search
  - apps/web-client/src/components/search
  - apps/web-client/src/components/home/hero-section.tsx
  - apps/web-client/src/hooks/use-voice-search.ts
  - apps/web-client/src/hooks/use-geolocation.ts
  - docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md
---

# Spec 011 — Tìm kiếm thông minh (hybrid AI)

> Baseline mô tả hành vi **đang có**. Thiết kế thuật toán chi tiết (trọng số, công thức) nằm ở [docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md](../../docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md) — đó là tài liệu cấp plan của spec này.

## 1. Bối cảnh & vấn đề

Người dùng mô tả nhu cầu bằng câu tự nhiên tiếng Việt: *"quán cà phê yên tĩnh quận 1 cho 4 người buổi tối"*, *"lẩu ngon gần đây"*, *"Highlands Bitexco"*. Tìm theo từ khoá đơn thuần bỏ lỡ ý nghĩa; bộ lọc cứng thì quá nhiều bước. Đây là tính năng cốt lõi của MyNook ([mission.md](../mission.md) §4.1).

## 2. Mục tiêu

- Hiểu câu tự nhiên: tên quán, loại quán, đặc điểm mong muốn / không mong muốn, khu vực, số người, khung giờ, yêu cầu điểm cao.
- Xếp hạng kết hợp nhiều tín hiệu thay vì một tín hiệu duy nhất.
- Hầu như không bao giờ trả "0 kết quả" khi dữ liệu có quán liên quan.
- Vẫn hoạt động (kém thông minh hơn) khi dịch vụ AI lỗi.

### Ngoài phạm vi

- Gợi ý từ khoá khi đang gõ (autocomplete).
- Tìm theo khoảng giá / giờ đang mở cửa.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Khách / người dùng | Tìm quán bằng câu tự nhiên hoặc giọng nói, ưu tiên gần mình |
| Admin | Điều chỉnh danh mục / tên gọi khác để AI hiểu tốt hơn ([004](../004-location-taxonomy/spec.md), [005](../005-venue-categories/spec.md)) |

## 4. User stories

### US-1: Tìm bằng câu tự nhiên (P1)

**Là** khách, **tôi muốn** gõ câu mô tả nhu cầu, **để** nhận danh sách quán phù hợp nhất.

- [x] **AC-1.1** — Số người được nhận diện từ "5 người", "10 khách", "nhóm 6", "group of 4"... → chỉ trả quán có quy mô nhóm tối đa ≥ số đó.
- [x] **AC-1.2** — Khung giờ được nhận diện từ "sáng", "trưa/chiều", "tối/đêm", "cả ngày" → đặc điểm quán chỉ tính theo khung giờ đó (hoặc cả ngày). Vd. quán "yên tĩnh buổi sáng nhưng ồn buổi tối" không khớp "yên tĩnh buổi tối".
- [x] **AC-1.3** — Loại quán, đặc điểm mong muốn, đặc điểm **không** mong muốn ("không ồn"), khu vực, yêu cầu điểm cao được AI trích xuất; chỉ chấp nhận giá trị có trong danh mục.
- [x] **AC-1.4** — Quán có đặc điểm bị loại trừ bị trừ điểm (đẩy xuống) chứ không bị loại hẳn.
- [x] **AC-1.5** — Khu vực nêu trong câu ("quận 1", "q1", "HN") giới hạn kết quả trong khu vực đó.
- [x] **AC-1.6** — "Quán điểm cao / ngon nhất" → chỉ lấy quán ≥ 4.0 sao.
- [x] **AC-1.7** — AI tự tin cao và nhận ra loại quán → chỉ trả quán thuộc loại đó.
- [x] **AC-1.8** — Quán bị ẩn hoặc đang "kín chỗ" không bao giờ xuất hiện.

### US-2: Tìm theo tên quán (P1)

- [x] **AC-2.1** — Câu được nhận diện là tên quán → ưu tiên độ giống tên (chấp nhận gõ sai, không dấu), so với cả tên và tên chi nhánh ("Highlands" khớp "Highlands Bitexco").
- [x] **AC-2.2** — Quán có độ giống tên quá thấp bị loại khỏi kết quả theo tên.
- [x] **AC-2.3** — Câu vừa có tên vừa có đặc điểm → cân bằng giữa tên và đặc điểm.

### US-3: Ưu tiên quán gần tôi (P1)

- [x] **AC-3.1** — Trang tìm kiếm có nút bật / tắt vị trí với trạng thái: "Bật vị trí để tìm gần đây", "Đang lấy vị trí...", "Đang dùng vị trí của bạn", "Đã từ chối GPS", "GPS không khả dụng".
- [x] **AC-3.2** — Có vị trí → kết quả gần hơn được cộng điểm (không loại quán xa), mỗi thẻ hiện khoảng cách.
- [x] **AC-3.3** — Có vị trí sau khi đã tìm → tự tìm lại để áp dụng khoảng cách.
- [x] **AC-3.4** — API hỗ trợ giới hạn bán kính (mét) quanh vị trí người dùng.

### US-4: Luôn có kết quả (P1)

- [x] **AC-4.1** — Nếu điều kiện chặt (loại quán, điểm cao, tên, khu vực, bán kính) cho ít hơn 5 kết quả → tự nới lỏng các điều kiện chặt và tìm lại; vẫn giữ ưu tiên quán gần.
- [x] **AC-4.2** — AI trích xuất lỗi / quá 3.5 giây / thiếu cấu hình → vẫn tìm bằng ngữ nghĩa.
- [x] **AC-4.3** — Dịch vụ ngữ nghĩa lỗi → vẫn tìm bằng tên, đặc điểm, điểm đánh giá.
- [x] **AC-4.4** — Quán chưa có chỉ mục ngữ nghĩa vẫn có thể xuất hiện nhờ các tín hiệu khác.
- [x] **AC-4.5** — Không có kết quả → "Không tìm thấy kết quả" kèm gợi ý câu tìm mẫu.

### US-5: Tìm bằng giọng nói (P2)

- [x] **AC-5.1** — Ô tìm kiếm ở trang chủ có nút micro: bấm để ghi âm, bấm lại để dừng; tự dừng sau 15 giây.
- [x] **AC-5.2** — Âm thanh được chuyển thành chữ tiếng Việt rồi tìm kiếm như gõ tay.
- [x] **AC-5.3** — Trình duyệt không hỗ trợ / bị từ chối micro / lỗi chuyển đổi → hiện thông báo lỗi, không tìm.

### US-6: Xem kết quả trên bản đồ (P2)

- [x] **AC-6.1** — Màn hình rộng: danh sách bên trái (60%), bản đồ bên phải (40%) với marker cho từng kết quả.
- [x] **AC-6.2** — Thẻ kết quả: ảnh, tên, loại chính, điểm, khu vực / địa chỉ, khoảng cách (nếu có), mức độ đông.
- [x] **AC-6.3** — Đường dẫn trang tìm kiếm chứa câu tìm (`?q=`) để chia sẻ / quay lại được.

## 5. Yêu cầu chức năng

- **FR-1**: Câu tìm < 2 ký tự → trả rỗng; mặc định 20 kết quả, tối đa 50, hỗ trợ phân trang theo vị trí bắt đầu.
- **FR-2**: Chiến lược xếp hạng chọn theo loại ý định (tên / đặc điểm / kết hợp / không rõ), xem bảng trọng số trong tài liệu thuật toán.
- **FR-3**: Mỗi lượt tìm được ghi nhật ký (câu tìm, bộ lọc trích xuất, người dùng nếu có) phục vụ phân tích.
- **FR-4**: Chế độ gỡ lỗi trả thêm điểm thành phần của từng kết quả.
- **FR-5**: Có cả đường tìm kiếm công khai và đường có đăng nhập.

## 6. Yêu cầu phi chức năng

- **NFR-1** (hiệu năng): Toàn bộ chấm điểm và sắp xếp trong một lần truy vấn cơ sở dữ liệu; kết quả trích xuất AI được nhớ đệm (5000 câu, 60 phút) và gộp các yêu cầu trùng đồng thời.
- **NFR-2** (chống lạm dụng): 60 lượt tìm / phút mỗi người.
- **NFR-3** (toàn vẹn): Mọi khoá AI trả về được lọc theo danh mục thật; đặc điểm vừa mong muốn vừa loại trừ thì giữ ở mong muốn.

## 7. Trường hợp biên

- "Quận 1 Hà Nội" → quận được tìm trong phạm vi Hà Nội, không nhầm sang TP.HCM.
- Câu chỉ có số người / khung giờ ("cho 5 người tối") → phần còn lại rỗng, dùng câu gốc để tìm ngữ nghĩa.
- Từ "sáng" trong tên quán ("Sáng Coffee") bị hiểu nhầm là khung giờ.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần cho người dùng chọn cách sắp xếp (gần nhất, điểm cao nhất) không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Trang tìm kiếm luôn gọi đường công khai — lượt tìm của người đã đăng nhập không được gắn với tài khoản trong nhật ký.
- [ ] **[GAP]** Nút "Sắp xếp: Phù hợp nhất" chỉ để trang trí; bảng bộ lọc nổi trên bản đồ không bao giờ mở.
- [ ] **[GAP]** Không có nút "xem thêm" / phân trang ở giao diện; "tổng số kết quả" thực chất là số kết quả của trang hiện tại.
- [ ] **[GAP]** Màn hình nhỏ không có cách mở bản đồ.
- [ ] **[GAP]** Trang tìm kiếm không có nút giọng nói (chỉ trang chủ có).
- [ ] **[GAP]** Chuyển giọng nói thành chữ gọi thẳng dịch vụ AI từ trình duyệt bằng khoá công khai — vi phạm [constitution](../constitution.md) §IV.3.
- [ ] **[GAP]** Gợi ý trong ô tìm kiếm trang chủ bằng tiếng Anh ("Try 'Quiet cafe in District 1...'").
- [ ] **[GAP]** Lỗi tìm kiếm hiển thị như "không có kết quả", không phân biệt lỗi hệ thống.
