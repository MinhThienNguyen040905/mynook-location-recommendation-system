import { apiClient, setCookie, deleteCookie } from './client';
import { API_ENDPOINTS } from '@/config/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthUser,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '@/types/auth';

/** Đăng nhập — lưu token vào cookie sau khi thành công */
export async function login(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, body);
  setCookie(ACCESS_TOKEN_KEY, data.access_token);
  setCookie(REFRESH_TOKEN_KEY, data.refresh_token);
  setCookie('user_type', data.user.type);
  return data;
}

/** Đăng ký — tự động đăng nhập sau khi tạo tài khoản */
export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, body);
  setCookie(ACCESS_TOKEN_KEY, data.access_token);
  setCookie(REFRESH_TOKEN_KEY, data.refresh_token);
  setCookie('user_type', data.user.type);
  return data;
}

/** Lấy profile của user đang đăng nhập */
export async function getProfile(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.PROFILE);
  return data;
}

/** Quên mật khẩu — gửi email để nhận reset token */
export async function forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<ForgotPasswordResponse>(
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
    body,
  );
  return data;
}

/** Đặt lại mật khẩu bằng reset token */
export async function resetPassword(body: ResetPasswordRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.AUTH.RESET_PASSWORD,
    body,
  );
  return data;
}

/** Đổi mật khẩu (yêu cầu đăng nhập) */
export async function changePassword(body: ChangePasswordRequest): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
    body,
  );
  return data;
}

/** Cập nhật profile (yêu cầu đăng nhập) */
export async function updateProfile(body: UpdateProfileRequest): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>(API_ENDPOINTS.AUTH.UPDATE_PROFILE, body);
  return data;
}

/** Đăng xuất — xoá tất cả cookie */
export function logout() {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
  deleteCookie('user_type');
}
