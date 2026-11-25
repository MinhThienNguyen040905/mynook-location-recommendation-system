-- Migration 014: Đếm số lần nhập sai OTP đăng ký
-- Spec 001 GAP 6 (specs/001-auth-account/log.md LOG-004): sai đủ 5 lần → mã bị huỷ.
-- An toàn khi chạy lại; giá trị mặc định 0 không ảnh hưởng bản ghi OTP đang có.

ALTER TABLE auth_schema.registration_otps
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;
