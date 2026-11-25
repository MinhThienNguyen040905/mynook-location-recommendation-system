# MyNook — Lộ trình (Roadmap)

> Lộ trình phát triển theo giai đoạn. Mỗi hạng mục trỏ tới spec tương ứng trong `specs/`. Cập nhật file này khi một spec đổi trạng thái hoặc thêm hạng mục mới.

**Chú thích:** ✅ đã xong · 🟡 đang làm / làm một phần · ⬜ chưa bắt đầu

---

## Giai đoạn 1 — Nền tảng (đến 04/2026) ✅

| Hạng mục | Spec | Trạng thái |
|---|---|---|
| Kiến trúc microservice, gateway, shared libs | [constitution](constitution.md) | ✅ |
| Đăng ký OTP, đăng nhập, refresh token, quên mật khẩu | [001](001-auth-account/spec.md) | ✅ |
| Quản lý địa điểm cho chủ quán | [002](002-venue-management/spec.md) | ✅ |
| Danh mục địa điểm | [005](005-venue-categories/spec.md) | ✅ |
| Thành phố / quận (PostGIS) | [004](004-location-taxonomy/spec.md) | ✅ |
| Quản lý menu | [006](006-menu-management/spec.md) | ✅ |

## Giai đoạn 2 — Khám phá thông minh (04–05/2026) ✅

| Hạng mục | Spec | Trạng thái |
|---|---|---|
| Tìm kiếm hybrid AI (semantic + tag + tên + geo) | [011](011-hybrid-search/spec.md) | ✅ |
| Gợi ý cá nhân hoá (taste vector) | [012](012-recommendation/spec.md) | ✅ |
| AI gắn tag từ review & mô tả quán | [013](013-ai-tagging/spec.md) | ✅ |
| Yêu thích, đã xem gần đây | [008](008-favorites-history/spec.md) | ✅ |
| Đóng góp địa điểm từ cộng đồng | [003](003-community-contribution/spec.md) | ✅ |

## Giai đoạn 3 — Cộng đồng & dữ liệu (05–06/2026) ✅

| Hạng mục | Spec | Trạng thái |
|---|---|---|
| Review: bình luận lồng nhau, like/dislike | [007](007-reviews/spec.md) | ✅ |
| Báo cáo vi phạm & kiểm duyệt | [010](010-reports-moderation/spec.md) | 🟡 (thiếu giao diện báo cáo cho người dùng) |
| Thông báo (hệ thống, broadcast) | [009](009-notifications/spec.md) | ✅ |
| Import địa điểm từ Google Maps | [014](014-google-maps-import/spec.md) | ✅ |
| Admin dashboard & quản lý người dùng | [015](015-admin-console/spec.md) | ✅ |
| Rate limit Redis | [constitution](constitution.md) §V.4 | ✅ |

## Giai đoạn 4 — Chuẩn hoá spec-driven (11/2026) 🟡

| Hạng mục | Spec | Trạng thái |
|---|---|---|
| Dựng khung `specs/`, constitution, template | — | ✅ |
| Viết spec baseline cho các feature 001–017 | 001–017 | ✅ (draft, chờ duyệt) |
| Sửa khoảng trống quan trọng (xem [README](README.md) mục *Khoảng trống quan trọng nhất*) | — | 🟡 |
| Hoàn thiện tài khoản & xác thực + E2E Playwright (41 test) + Mailpit | [001](001-auth-account/spec.md) | ✅ 2026-11-25 — mọi khoảng trống đã đóng |
| Chuyển đổi model AI (Groq gỡ Llama, HF hết hạn mức) | [018](018-ai-model-migration/spec.md) | ⏸️ tạm dừng — 7/8 test AI đạt, chờ quyết định tag mô tả |
| Sửa build Vercel Preview lỗi (PR #15, từ commit spec 018 — nghi `onnxruntime-node`) | — | ⏸️ **hoãn** (2026-11-25) — tiêu chí hiện tại: chạy local đạt; cần log từ chủ project Vercel. Phải xong trước khi merge `develop` → `main` |
| Thêm unit test cho logic search/tagging/sanitize | — | ⬜ |
| Sửa bảo mật: bắt buộc `JWT_SECRET` ✅ (spec 001), chuyển Groq key khỏi FE ⬜ | — | 🟡 |

## Giai đoạn 5 — Mở rộng (đề xuất) ⬜

| Hạng mục | Spec | Ghi chú |
|---|---|---|
| Đặt chỗ (booking) | [016](016-booking/spec.md) | Đã có route/type ở FE, chưa có backend |
| Chủ quán xem & phản hồi review | [017](017-owner-review-response/spec.md) | Route `/dashboard/reviews` đã khai báo, chưa có trang |
| Gợi ý theo cụm sở thích (cluster-then-query) | — | Khắc phục nhược điểm centroid khi user có nhiều gu |
| Cache search lên Redis khi scale ngang | — | |
| Công tắc dark mode | — | Xem [ux-ui.md](ux-ui.md) §8 |
| Chuyển xác thực sang **Supabase Auth** (kèm đăng nhập Google / Facebook, xác thực 2 lớp) | spec mới (chưa tạo) | Xem [spec 001](001-auth-account/spec.md) §10 — chỉ làm khi cần đăng nhập mạng xã hội / 2 lớp; vẫn phải tự cấu hình SMTP |

---

*Thứ tự và mốc thời gian giai đoạn 4–5 là đề xuất — điều chỉnh theo kế hoạch đồ án.*
