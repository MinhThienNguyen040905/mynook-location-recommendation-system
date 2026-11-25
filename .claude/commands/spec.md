---
description: Tạo spec mới (spec.md) cho một tính năng theo quy trình spec-driven
argument-hint: <mô tả tính năng>
---

Tạo spec mới cho tính năng: $ARGUMENTS

1. Đọc `specs/constitution.md` và `specs/README.md`.
2. Tìm số NNN lớn nhất trong `specs/` (bỏ qua `_templates`), dùng NNN+1 (3 chữ số, bắt đầu 001). Đặt tên thư mục `specs/NNN-<ten-kebab-khong-dau>/`.
3. Đọc code liên quan để hiểu hành vi hiện tại (chỉ để hiểu bối cảnh — spec không nhắc tên file/bảng/framework).
4. Copy `specs/_templates/spec.md` và điền đầy đủ: bối cảnh, mục tiêu, ngoài phạm vi, user stories với AC dạng Given/When/Then, FR, NFR, trường hợp biên. `status: draft`, ngày hôm nay.
5. Chỗ nào chưa chắc → ghi vào mục "Câu hỏi mở" với nhãn `[CẦN LÀM RÕ]`, KHÔNG tự đoán.
6. Thêm dòng vào bảng "Danh mục spec" trong `specs/README.md`.
7. KHÔNG viết plan hay code. Kết thúc bằng: tóm tắt spec + danh sách câu hỏi mở cần người dùng trả lời để chuyển sang `approved`.
