---
id: '008'
title: Yêu thích & đã xem gần đây
status: draft
implementation: done
owner: <người phụ trách>
created: 2026-11-24
updated: 2026-11-24
services: [interaction-service, api-gateway, web-client]
code:
  - apps/interaction-service/src/app/modules/favorites
  - apps/interaction-service/src/app/modules/interactions
  - apps/api-gateway/src/app/modules/interaction/favorites.controller.ts
  - apps/api-gateway/src/app/modules/interaction/interactions.controller.ts
  - apps/web-client/src/app/(user)/favorites
  - apps/web-client/src/app/(user)/profile
  - apps/web-client/src/components/venue-detail/favorite-button.tsx
  - apps/web-client/src/components/venue-detail/track-recently-viewed.tsx
  - apps/web-client/src/components/home/recently-viewed-section.tsx
  - apps/web-client/src/hooks/use-recently-viewed.ts
---

# Spec 008 — Yêu thích & đã xem gần đây

> Baseline mô tả hành vi **đang có**. Mục 9 liệt kê khoảng trống đã biết.

## 1. Bối cảnh & vấn đề

Người dùng thường thấy một quán hay nhưng chưa đi ngay; họ cần lưu lại và tìm lại dễ dàng. Họ cũng hay quay lại những quán vừa xem để so sánh. Quán yêu thích còn là tín hiệu chính cho gợi ý cá nhân hoá ([012](../012-recommendation/spec.md)).

## 2. Mục tiêu

- Lưu / bỏ lưu quán bằng một chạm, ở mọi nơi có thẻ quán.
- Danh sách yêu thích tìm và lọc được.
- Quay lại các quán vừa xem từ trang chủ, kể cả khi chưa đăng nhập.

### Ngoài phạm vi

- Nhiều danh sách / bộ sưu tập do người dùng đặt tên.
- Chia sẻ danh sách yêu thích.

## 3. Người dùng liên quan

| Vai trò | Quan tâm |
|---|---|
| Người dùng đã đăng nhập | Lưu quán, xem danh sách yêu thích, lịch sử xem đồng bộ giữa thiết bị |
| Khách | Xem lại quán vừa xem trên cùng trình duyệt |

## 4. User stories

### US-1: Lưu quán yêu thích (P1)

**Là** người dùng, **tôi muốn** bấm trái tim để lưu quán, **để** tìm lại sau.

- [x] **AC-1.1** — Nút trái tim có hai dạng: đầy đủ ("Yêu thích" / "Đã yêu thích") trên trang chi tiết và dạng tròn gọn trên thẻ quán.
- [x] **AC-1.2** — Bấm → trạng thái đổi ngay (lạc quan), sau đó xác nhận bằng toast "Đã thêm vào yêu thích" / "Đã bỏ khỏi yêu thích". Lỗi → hoàn trạng thái và báo lỗi.
- [x] **AC-1.3** — Chưa đăng nhập → toast "Đăng nhập để lưu venue vào yêu thích" và chuyển tới trang đăng nhập.
- [x] **AC-1.4** — Lưu một quán đã lưu không tạo bản ghi trùng.
- [x] **AC-1.5** — Trạng thái trái tim đúng trên mọi thẻ quán nhờ tải một lần danh sách mã quán đã lưu.

### US-2: Xem danh sách đã lưu (P1)

- [x] **AC-2.1** — Trang Yêu thích liệt kê quán đã lưu, mới lưu nhất trước, chỉ gồm quán đang hoạt động.
- [x] **AC-2.2** — Tìm theo tên / địa chỉ và lọc theo loại quán (mặc định "Tất cả"); hiển thị "x / y venue".
- [x] **AC-2.3** — Bỏ lưu ngay trong danh sách, có xác nhận.
- [x] **AC-2.4** — Trạng thái rỗng phân biệt "Chưa có venue yêu thích" và "Không tìm thấy venue" (khi đang lọc).

### US-3: Xem lại quán vừa xem (P2)

**Là** người dùng, **tôi muốn** thấy các quán vừa xem ở trang chủ, **để** quay lại nhanh.

- [x] **AC-3.1** — Mở trang chi tiết quán → quán được ghi vào lịch sử xem: luôn lưu trên trình duyệt (tối đa 12); nếu đã đăng nhập thì lưu thêm trên máy chủ.
- [x] **AC-3.2** — Trang chủ hiển thị tối đa 8 quán vừa xem gần nhất: người đã đăng nhập lấy từ máy chủ (đồng bộ giữa thiết bị), khách lấy từ trình duyệt.
- [x] **AC-3.3** — Mỗi quán chỉ xuất hiện một lần, theo lần xem gần nhất; quán đã bị ẩn không hiển thị.
- [x] **AC-3.4** — Không có lịch sử → ẩn hẳn mục này.
- [x] **AC-3.5** — Ghi lịch sử lỗi không ảnh hưởng tới việc xem trang.

### US-4: Thống kê cá nhân (P3)

- [x] **AC-4.1** — Trang hồ sơ hiển thị số review đã viết và số quán đã xem (đếm quán khác nhau).

## 5. Yêu cầu chức năng

- **FR-1**: Mọi thao tác yêu thích và lịch sử trên máy chủ cần đăng nhập.
- **FR-2**: Mỗi cặp (người dùng, quán) có tối đa một bản ghi yêu thích và một bản ghi lượt xem (cập nhật thời điểm khi xem lại), để dữ liệu không phình ra khi người dùng tải lại trang liên tục.
- **FR-3**: Danh sách trả về kèm đủ thông tin để vẽ thẻ quán (ảnh, khu vực, điểm, loại chính).

## 6. Yêu cầu phi chức năng

- **NFR-1** (trải nghiệm): Thao tác yêu thích phản hồi tức thì nhờ cập nhật lạc quan.
- **NFR-2** (riêng tư): Lịch sử của khách chỉ nằm trên trình duyệt của họ.

## 7. Trường hợp biên

- Quán đã lưu sau đó bị ẩn → biến mất khỏi danh sách; hiện lại nếu quán được khôi phục.
- Khách xem nhiều quán rồi đăng nhập → lịch sử trên trình duyệt không được gộp lên máy chủ.

## 8. Câu hỏi mở

- [ ] **[CẦN LÀM RÕ]** Có cần gộp lịch sử xem trên trình duyệt vào tài khoản sau khi đăng nhập không?

## 9. Khoảng trống so với hiện trạng

- [ ] **[GAP]** Yêu thích một quán không tồn tại / đã ẩn không bị chặn ở backend.
- [ ] **[GAP]** Danh sách yêu thích không phân trang.
- [ ] **[GAP]** Trường "thời gian xem" được lưu nhưng luôn bằng 0 — chưa đo.
