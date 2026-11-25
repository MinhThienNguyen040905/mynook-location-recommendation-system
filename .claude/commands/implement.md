---
description: Triển khai các task chưa xong của một spec
argument-hint: <NNN> [T<x>]
---

Triển khai spec $ARGUMENTS.

1. Đọc `spec.md`, `plan.md`, `tasks.md` trong `specs/<NNN>-*/` và `specs/constitution.md`.
2. Nếu có chỉ định task (vd. `T4`) thì chỉ làm task đó; nếu không, làm lần lượt các task `[ ]` theo thứ tự.
3. Sau mỗi task: tick `[x]` trong `tasks.md`.
4. Nếu phát hiện plan/spec sai hoặc thiếu → DỪNG, báo người dùng, đề xuất sửa spec/plan; không tự ý làm khác plan.
5. Khi tất cả task xong: chạy `npx nx affected -t lint typecheck build`, báo kết quả thật. Nếu pass, đối chiếu code với spec, cập nhật `status: done` ở spec và bảng danh mục trong `specs/README.md`.
