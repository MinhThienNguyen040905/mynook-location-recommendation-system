---
description: Chia plan đã duyệt thành tasks.md
argument-hint: <NNN>
---

Sinh danh sách task cho spec $ARGUMENTS.

1. Mở `specs/$ARGUMENTS-*/plan.md`. Nếu `status` khác `approved` → dừng và báo người dùng.
2. Copy `specs/_templates/tasks.md` vào cùng thư mục, thay phần mẫu bằng task thật theo các phase: DB/shared → backend service → gateway → frontend → kiểm chứng.
3. Mỗi task: nhỏ (≤ ~1 giờ), trỏ file cụ thể, ghi FR/AC liên quan, đánh `[P]` nếu làm song song được.
4. Kiểm tra: mọi AC trong spec đều có ít nhất một task kiểm chứng. Thiếu → bổ sung.
5. Spec chuyển `status: in-progress`. KHÔNG viết code.
