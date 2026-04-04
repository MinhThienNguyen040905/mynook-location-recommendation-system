import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Vui lòng nhập họ tên')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu tối thiểu 6 ký tự')
    .max(128, 'Mật khẩu tối đa 128 ký tự'),
  type: z.enum(['customer', 'owner']),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(6, 'Mật khẩu tối thiểu 6 ký tự')
      .max(128, 'Mật khẩu tối đa 128 ký tự'),
    confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Mật khẩu không khớp',
    path: ['confirm_password'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
