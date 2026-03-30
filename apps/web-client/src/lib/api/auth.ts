import { apiClient, setCookie, deleteCookie } from './client';
import { API_ENDPOINTS } from '@/config/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants';
import type { LoginRequest, RegisterRequest, AuthResponse, AuthUser } from '@/types/auth';

/** Đăng nhập — lưu token vào cookie sau khi thành công */
export async function login(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, body);
  setCookie(ACCESS_TOKEN_KEY, data.access_token);
  setCookie(REFRESH_TOKEN_KEY, data.refresh_token);
  setCookie('user_role', data.user.role); // dùng bởi middleware.ts
  return data;
}

/** Đăng ký — tự động đăng nhập sau khi tạo tài khoản */
export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, body);
  setCookie(ACCESS_TOKEN_KEY, data.access_token);
  setCookie(REFRESH_TOKEN_KEY, data.refresh_token);
  setCookie('user_role', data.user.role);
  return data;
}

/** Lấy profile của user đang đăng nhập */
export async function getProfile(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.PROFILE);
  return data;
}

/** Đăng xuất — xoá tất cả cookie */
export function logout() {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
  deleteCookie('user_role');
}
