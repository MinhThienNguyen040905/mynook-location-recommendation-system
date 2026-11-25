# MyNook — UX/UI Guidelines

> Hướng dẫn thiết kế dùng chung cho mọi màn hình. Spec có giao diện phải tuân theo tài liệu này; plan ghi rõ màn hình/component nào thêm mới hoặc thay đổi.

## 1. Tinh thần thiết kế

**Ấm áp, thư thái, như một góc quen.** Giao diện gọn, nhiều khoảng trắng, tông kem/cát với điểm nhấn cam. Ảnh địa điểm là nhân vật chính, UI lùi lại phía sau.

- Nội dung trước, trang trí sau.
- Mỗi màn hình có **một hành động chính** rõ ràng.
- Ngôn ngữ giao diện: **tiếng Việt**, giọng thân thiện, ngắn gọn ("Lưu quán", không viết "Thêm vào danh sách yêu thích của bạn").

## 2. Brand tokens

Định nghĩa trong [`apps/web-client/src/app/global.css`](../apps/web-client/src/app/global.css).

### Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `nook-cream` | `#f5f5f0` | Nền phụ, section xen kẽ |
| `nook-sand` | `#e8e4d9` | Viền card, input, divider |
| `nook-olive` | `#ea580c` | **Màu nhấn chính** (CTA, link, trạng thái active). *Lưu ý: tên token là "olive" nhưng giá trị là cam.* |
| `nook-clay` | `#a67c52` | Nhấn phụ, badge, icon trang trí |
| `nook-ink` | `#1a1a1a` | Chữ chính |
| Nền trang public | `#f8f6f5` (light) / `#221610` (dark) | Body trang chủ, tìm kiếm |
| `destructive` | đỏ (token shadcn) | Xoá, lỗi |

Owner dashboard bọc trong `.layout-owner`, đặt `--primary` thành cam để component shadcn đồng bộ màu nhấn.

### Chữ

| Font | Dùng cho |
|---|---|
| **Cormorant Garamond** (`font-serif`) | Tiêu đề lớn, tên quán, hero |
| **Work Sans** (`font-worksans`) | Tiêu đề phụ, nút |
| **Inter** / sans hệ thống | Nội dung, form, bảng |

### Hình khối

- Bo góc: card `rounded-2xl`, input `rounded-xl`, nút `rounded-full`.
- Bóng đổ nhẹ (`shadow-sm`, hover lên `shadow-md`). Không dùng bóng đậm.
- Class dùng sẵn: `.nook-card`, `.nook-button-primary`, `.nook-button-secondary`, `.nook-input`.

## 3. Component

1. **Ưu tiên** component shadcn trong `src/components/ui/` (Button, Dialog, Sheet, Drawer, Tabs, Select, Table, Skeleton...).
2. Component theo domain đặt trong `src/components/<domain>/` (`home`, `search`, `venue-detail`, `review`, `owner`, `admin`, `map`...).
3. Không tự viết lại component đã có. Cần biến thể → dùng `cva` (class-variance-authority).
4. Icon dùng `lucide-react`, cỡ mặc định 16–20px.

## 4. Cấu trúc màn hình theo vai trò

| Group | Layout | Màn hình |
|---|---|---|
| `(public)` | Navbar + Footer | Trang chủ, Tìm kiếm (list + bản đồ), Chi tiết quán |
| `(auth)` | Form canh giữa | Đăng nhập, Đăng ký (OTP), Quên mật khẩu |
| `(user)` | Navbar | Yêu thích, Hồ sơ |
| `(owner)` | Sidebar + topbar (`/dashboard`) | Tổng quan, Thông tin quán, Menu, Hồ sơ |
| `(admin)` | Admin sidebar (`/admin`) | Dashboard, Users, Venues, Reports, Categories, Locations, Imports |

### Trang chủ (thứ tự section)

Hero (ô tìm kiếm + voice) → Dải tag phổ biến (pill) → Đã xem gần đây → Gợi ý cho bạn → Đánh giá cao → Tất cả địa điểm → Banner.

Section cá nhân hoá (*Đã xem gần đây*, *Gợi ý cho bạn*) **ẩn hoàn toàn** khi không có dữ liệu, không hiện khung rỗng.

## 5. Pattern tương tác

| Tình huống | Cách xử lý |
|---|---|
| Đang tải | `Skeleton` đúng hình dạng nội dung; không dùng spinner toàn trang |
| Danh sách rỗng | Minh hoạ + một câu giải thích + một hành động gợi ý |
| Lỗi tải dữ liệu | Thông báo trong khu vực đó + nút "Thử lại"; không làm vỡ cả trang |
| Thành công / lỗi thao tác | Toast `sonner` góc trên phải |
| Hành động phá huỷ (xoá) | Dialog xác nhận, nút màu `destructive` |
| Form | Validate bằng zod, hiện lỗi dưới từng field, disable nút khi đang gửi |
| Cần đăng nhập | Chuyển tới `/login` và quay lại trang cũ sau khi đăng nhập |
| Ảnh | Lightbox xem toàn màn hình, điều hướng bằng phím ← → và Esc |
| Bản đồ | Leaflet; marker tuỳ biến (`map-markers.css`); bản đồ không được đè lên modal |

## 6. Responsive

- Thiết kế **mobile-first**; breakpoint Tailwind mặc định (`sm 640`, `md 768`, `lg 1024`, `xl 1280`).
- Trang tìm kiếm: mobile hiển thị list, bản đồ mở bằng nút/drawer; desktop chia đôi list + bản đồ.
- Tab ngang cuộn được dùng `.no-scrollbar`.
- Sidebar dashboard/admin thu thành `Sheet` trên mobile.

## 7. Accessibility

- Mọi ảnh có `alt` (tên quán / mô tả).
- Nút chỉ có icon phải có `aria-label`.
- Tương phản chữ tối thiểu WCAG AA (4.5:1). Chữ trắng trên `nook-olive` chỉ dùng cỡ ≥ 14px đậm.
- Điều khiển được bằng bàn phím: focus ring rõ (`ring`), dialog bẫy focus (Radix lo sẵn).

## 8. Vấn đề đã biết

- [ ] Tên token `nook-olive` không khớp màu thực tế (cam) — cân nhắc đổi thành `nook-accent`.
- [ ] `--font-sans` trỏ tới Geist nhưng font này chưa được nạp; thực tế đang rơi về font hệ thống.
- [ ] Có token dark mode nhưng chưa có công tắc chuyển theme.
- [ ] Một số màu hard-code (`bg-[#f8f6f5]`, `#e9590c`) nên đưa vào token.
- [ ] Nhiều nhãn giao diện còn bằng tiếng Anh (trang chi tiết quán, review, gợi ý, ô tìm kiếm trang chủ, dashboard admin) — chi tiết ở mục 9 các spec 002, 007, 011, 012, 015.
- [ ] Liên kết chết: "Đặt chỗ" (người dùng / chủ quán), "Ưu đãi", "Phân tích", "Cài đặt" trong khu quản lý (xem [016](016-booking/spec.md), [017](017-owner-review-response/spec.md)).
