---
id: '012'
title: Gợi ý cá nhân hoá
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [search-ai-service, api-gateway, web-client]
code:
  - apps/search-ai-service/src/app/modules/search/recommend.service.ts
  - apps/api-gateway/src/app/modules/search/search.controller.ts
  - apps/web-client/src/components/home/recommended-section.tsx
  - docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md
---

# Spec 012 — Gợi ý cá nhân hoá

> Baseline mô tả hành vi **đang có**. Thuật toán chi tiết (taste vector, kNN) ở [docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md](../../docs/SEARCH_AND_RECOMMENDATION_ALGORITHM.md) §4.

## 1. Bối cảnh & vấn đề

Người dùng quay lại trang chủ thường chưa có ý định tìm gì cụ thể. Hiển thị ngay những quán hợp gu, dựa trên quán họ đã thích, giúp khám phá mà không cần gõ.

## 2. Mục tiêu

- Gợi ý quán tương tự những quán người dùng đã yêu thích hoặc đánh giá cao.
- Không gợi ý lại quán người dùng đã biết.
- Không hiển thị gợi ý kém chất lượng khi chưa đủ dữ liệu.

### Ngoài phạm vi

- Gợi ý cho khách chưa đăng nhập.
- Lọc cộng tác ("người giống bạn cũng thích...").
- Gợi ý theo vị trí / thời điểm hiện tại.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng đã đăng nhập | Nhận gợi ý hợp gu ở trang chủ |

## 4. User stories

### US-1: Nhận gợi ý hợp gu (P1)

**Là** người dùng, **tôi muốn** thấy các quán giống quán tôi thích, **để** khám phá chỗ mới phù hợp.

- [x] **AC-1.1** — Tín hiệu "thích" gồm: quán đã yêu thích và quán tôi đánh giá ≥ 4 sao; lấy tối đa 50 tín hiệu gần nhất, chỉ tính quán đang hoạt động.
- [x] **AC-1.2** — Gu của tôi là trung bình đặc trưng ngữ nghĩa của các quán đó; gợi ý là những quán gần với gu nhất, cùng độ gần thì quán điểm cao hơn trước.
- [x] **AC-1.3** — Loại khỏi gợi ý mọi quán tôi đã yêu thích hoặc đã review (kể cả review điểm thấp), quán bị ẩn, quán "kín chỗ" và quán chưa có đặc trưng ngữ nghĩa.
- [x] **AC-1.4** — Trang chủ hiển thị tối đa 6 gợi ý với ảnh, tên, khu vực, điểm, loại chính, kèm mô tả "Gợi ý riêng cho bạn dựa trên các quán bạn đã yêu thích và đánh giá tốt."
- [x] **AC-1.5** — API cho phép lấy tối đa 30 gợi ý.

### US-2: Khởi đầu lạnh (P1)

- [x] **AC-2.1** — Chưa đăng nhập hoặc chưa có tín hiệu nào → không hiển thị mục gợi ý (không có khung rỗng).
- [x] **AC-2.2** — Gọi API gợi ý khi chưa đăng nhập → bị từ chối.

### US-3: Gợi ý thay đổi theo hành vi mới (P2)

- [x] **AC-3.1** — Gợi ý được tính lại ở mỗi lần gọi, không cần tác vụ chạy nền: yêu thích / đánh giá cao một quán mới làm thay đổi kết quả ở lần gọi kế tiếp.
- [ ] **AC-3.2** — Trang chủ phản ánh thay đổi ngay sau khi tôi yêu thích một quán. *(Hiện giao diện giữ kết quả cũ tới 5 phút — xem mục 9.)*

## 5. Yêu cầu chức năng

- **FR-1**: Gợi ý chỉ dùng dữ liệu của chính người dùng.
- **FR-2**: Mỗi gợi ý trả kèm độ tương đồng (0–1).

## 6. Yêu cầu phi chức năng

- **NFR-1** (hiệu năng): Tính gu và tìm láng giềng gần trong một truy vấn.
- **NFR-2** (chịu lỗi): Lỗi gợi ý không ảnh hưởng các mục khác của trang chủ.

## 7. Trường hợp biên

- Người dùng thích cả "cà phê yên tĩnh" và "bar sôi động" → gu trung bình rơi vào vùng trung tính, gợi ý có thể lẫn lộn (hạn chế đã biết của cách lấy trung bình).
- Mọi quán tín hiệu đều chưa có đặc trưng ngữ nghĩa → không có gợi ý.
- Người dùng đã tương tác với gần hết quán → ít hoặc không có gợi ý.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Khi không có gợi ý, có nên thay bằng danh sách phổ biến thay vì ẩn hẳn không?
- [ ] **[CẦN LÀM RÕ]** Lượt xem quán có nên là tín hiệu (yếu) cho gợi ý không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Giao diện giữ kết quả gợi ý 5 phút và không làm mới sau khi yêu thích / review.
- [ ] **[GAP]** Tiêu đề "Recommended For You" và liên kết "View all" bằng tiếng Anh; "View all" chỉ mở trang tìm kiếm trống.
- [ ] **[GAP]** Gu tính trung bình đều — chưa ưu tiên tín hiệu gần đây hay review 5 sao hơn 4 sao.
