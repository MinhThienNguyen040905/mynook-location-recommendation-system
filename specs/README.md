# Specs — Spec-Driven Development cho MyNook

Thư mục này chứa toàn bộ đặc tả của dự án. Code là **hệ quả** của spec: muốn thay đổi hành vi hệ thống thì sửa spec trước, rồi mới tới plan, tasks và code.

## Cấu trúc

```
specs/
├── README.md            # file này — quy trình + danh mục spec
├── mission.md           # sứ mệnh, người dùng, mục tiêu sản phẩm
├── stack.md             # công nghệ đã chọn + lý do
├── ux-ui.md             # hướng dẫn thiết kế giao diện
├── lotrinh.md           # lộ trình theo giai đoạn
├── constitution.md      # nguyên tắc bắt buộc (kiến trúc, DB, AI, bảo mật...)
├── _templates/
│   ├── spec.md          # CÁI GÌ & TẠI SAO
│   ├── plan.md          # LÀM THẾ NÀO
│   └── tasks.md         # checklist triển khai
└── NNN-<ten-tinh-nang>/ # mỗi tính năng một thư mục, NNN tăng dần (001, 002...)
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── log.md           # nhật ký sự cố / sửa lỗi: ghi TRƯỚC khi sửa, cập nhật kết quả test SAU khi sửa
```

## Quy trình

```
 ┌────────┐   duyệt   ┌────────┐   duyệt   ┌─────────┐        ┌────────────┐        ┌──────┐
 │ spec.md│ ────────▶ │ plan.md│ ────────▶ │ tasks.md│ ─────▶ │ implement  │ ─────▶ │ done │
 └────────┘           └────────┘           └─────────┘        └────────────┘        └──────┘
   draft →              Constitution         từng task,          tick [x],             status: done
   approved             Check                trỏ file + AC       commit theo task      spec khớp code
```

| Bước | Việc cần làm | Điều kiện để qua bước sau |
|---|---|---|
| 1. Specify | Copy `_templates/spec.md` → `specs/NNN-ten/spec.md`, viết user stories + AC | Không còn mục `[CẦN LÀM RÕ]`, `status: approved` |
| 2. Plan | Viết `plan.md`: API, DB, event, FE, Constitution Check | Không có ❌ chưa giải thích, `status: approved` |
| 3. Tasks | Chia `tasks.md` thành task nhỏ có trỏ file + AC | Mọi AC đều có task kiểm chứng |
| 4. Implement | Làm từng task, tick `[x]`, commit message ghi `spec NNN T<x>` | Tất cả task xong, lint/typecheck/build pass |
| 5. Close | Đối chiếu code với spec, sửa chỗ lệch, `status: done` | — |

### Dùng với Claude Code

| Lệnh | Tác dụng |
|---|---|
| `/spec <mô tả tính năng>` | Tạo thư mục `specs/NNN-...` và viết `spec.md` nháp |
| `/plan NNN` | Viết `plan.md` cho spec đã duyệt |
| `/tasks NNN` | Sinh `tasks.md` từ plan đã duyệt |
| `/implement NNN` | Làm lần lượt các task chưa xong |

## Quy ước

- **Đánh số**: 3 chữ số, tăng dần, không tái sử dụng (`001-review-reactions`, `002-...`). Tên thư mục dạng kebab-case không dấu.
- **Thay thế spec cũ**: tạo spec mới, đặt spec cũ `status: superseded` và ghi `superseded_by: NNN`.
- **Mã định danh** trong spec: `US-x` (user story), `AC-x.y` (tiêu chí chấp nhận), `FR-x`, `NFR-x`. Plan/tasks/commit trỏ về các mã này.
- Tài liệu thuật toán/thiết kế chung (không gắn một tính năng) vẫn để trong [`docs/`](../docs/).

## Tài liệu cấp dự án

| File | Đọc khi |
|---|---|
| [mission.md](mission.md) | Viết spec — kiểm tra tính năng phục vụ mục tiêu nào |
| [constitution.md](constitution.md) | Viết plan và code — luôn luôn |
| [stack.md](stack.md) | Viết plan — chọn thư viện / dịch vụ |
| [ux-ui.md](ux-ui.md) | Spec / plan có giao diện |
| [lotrinh.md](lotrinh.md) | Chọn việc làm tiếp theo; cập nhật khi spec đổi trạng thái |

## Danh mục spec

`implementation`: mức độ code hiện có (`done` / `partial` / `none`). Spec có `implementation: done` là **baseline** mô tả hành vi đang có trong code (không phải thiết kế mới); tiêu chí `[x]` là đã có, `[ ]` là chưa. Mục 9 của mỗi spec liệt kê khoảng trống `[GAP]` giữa hành vi mong muốn và hiện trạng — đó là nguồn việc cho các spec sửa lỗi / cải tiến tiếp theo.

### Khoảng trống quan trọng nhất (tổng hợp từ mục 9)

| Spec | Khoảng trống |
|---|---|
| [007](007-reviews/spec.md) | Điểm trung bình / số review của quán **không cập nhật** khi có review mới hoặc bị xoá |
| [013](013-ai-tagging/spec.md) | AI lỗi → sự kiện review bị đưa lại hàng đợi ngay, không giới hạn → có thể lặp vô hạn |
| [010](010-reports-moderation/spec.md) | Người dùng chưa có giao diện để báo cáo review / quán |
| [011](011-hybrid-search/spec.md), [stack](stack.md) | Khoá AI lộ ra trình duyệt (tìm bằng giọng nói) |
| ~~[001](001-auth-account/spec.md)~~ | ~~Quên mật khẩu chưa gửi email; khoá ký mặc định cố định~~ — **đã sửa 2026-11-25** |
| [002](002-venue-management/spec.md) | Chủ quán không cập nhật được mức độ đông; khách hàng tạo được quán qua đường của chủ quán |
| [015](015-admin-console/spec.md) | Dashboard đọc sai tên trường → 2 chỉ số luôn trống |

| ID | Tên | Status | Implementation | Services |
|---|---|---|---|---|
| [001](001-auth-account/spec.md) | Tài khoản & xác thực | done ✅ | done | auth-service, api-gateway, web-client |
| [002](002-venue-management/spec.md) | Quản lý địa điểm (chủ quán) | draft | done | venue-service, api-gateway, web-client |
| [003](003-community-contribution/spec.md) | Đóng góp địa điểm từ cộng đồng | draft | done | venue-service, api-gateway, web-client |
| [004](004-location-taxonomy/spec.md) | Danh mục địa lý (thành phố / quận) | draft | done | venue-service, search-ai-service, api-gateway, web-client |
| [005](005-venue-categories/spec.md) | Danh mục loại địa điểm | draft | done | venue-service, search-ai-service, api-gateway, web-client |
| [006](006-menu-management/spec.md) | Quản lý menu | draft | done | venue-service, api-gateway, web-client |
| [007](007-reviews/spec.md) | Đánh giá & bình luận | draft | done | interaction-service, api-gateway, web-client |
| [008](008-favorites-history/spec.md) | Yêu thích & đã xem gần đây | draft | done | interaction-service, api-gateway, web-client |
| [009](009-notifications/spec.md) | Thông báo | draft | done | interaction-service, api-gateway, web-client |
| [010](010-reports-moderation/spec.md) | Báo cáo vi phạm & kiểm duyệt | draft | partial | interaction-service, venue-service, api-gateway, web-client |
| [011](011-hybrid-search/spec.md) | Tìm kiếm thông minh (hybrid AI) | draft | done | search-ai-service, api-gateway, web-client |
| [012](012-recommendation/spec.md) | Gợi ý cá nhân hoá | draft | done | search-ai-service, api-gateway, web-client |
| [013](013-ai-tagging/spec.md) | Gắn tag tự động bằng AI | draft | done | search-ai-service, interaction-service, venue-service, api-gateway, web-client |
| [014](014-google-maps-import/spec.md) | Import địa điểm từ Google Maps | draft | done | venue-service, interaction-service, search-ai-service, api-gateway, web-client |
| [015](015-admin-console/spec.md) | Bảng điều khiển quản trị | draft | done | auth-service, venue-service, interaction-service, api-gateway, web-client |
| [016](016-booking/spec.md) | Đặt chỗ | draft | partial | interaction-service, api-gateway, web-client |
| [017](017-owner-review-response/spec.md) | Chủ quán xem & phản hồi review | draft | none | interaction-service, api-gateway, web-client |
| [018](018-ai-model-migration/spec.md) | Chuyển đổi model AI (Groq gỡ Llama, HF hết hạn mức) | in-progress ⏸️ | partial | search-ai-service, venue-service |
