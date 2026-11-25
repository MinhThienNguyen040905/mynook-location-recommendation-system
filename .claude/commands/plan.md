---
description: Viết plan.md kỹ thuật cho một spec đã duyệt
argument-hint: <NNN>
---

Viết plan kỹ thuật cho spec $ARGUMENTS.

1. Mở `specs/$ARGUMENTS-*/spec.md`. Nếu `status` khác `approved` hoặc còn `[CẦN LÀM RÕ]` → dừng, liệt kê điều cần làm rõ, không viết plan.
2. Đọc `specs/constitution.md` và code hiện có của các service liên quan (controller, service, entity, migration mới nhất, API client FE).
3. Copy `specs/_templates/plan.md` vào cùng thư mục và điền: giải pháp, Constitution Check (từng dòng ✅/❌/N/A + ghi chú), service bị ảnh hưởng, migration (số tiếp theo trong `libs/database/src/lib/migrations/`), API contract gateway + internal, event RMQ, frontend, fallback, bảng kiểm thử map từng AC.
4. Mọi quyết định phải truy về FR/AC trong spec. Không thêm tính năng ngoài spec.
5. `status: draft`. KHÔNG viết code. Kết thúc bằng tóm tắt các quyết định chính và rủi ro cần người dùng duyệt.
