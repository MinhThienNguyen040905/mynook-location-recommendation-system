import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants';

/**
 * Axios instance dùng cho tất cả request từ Client Component.
 * - Tự động gắn Authorization header từ cookie
 * - Tự động refresh token khi nhận 401
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 giây — tránh treo lâu khi gateway chưa chạy
  withCredentials: true, // gửi cookie theo mỗi request
});

// ─── Request Interceptor ──────────────────────────────
// Đọc access_token từ cookie và gắn vào header Authorization
apiClient.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const token = getCookie(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response Interceptor ─────────────────────────────
// Khi nhận 401 → thử refresh token một lần, rồi retry request gốc
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Đang refresh — xếp hàng chờ
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getCookie(REFRESH_TOKEN_KEY);
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newToken: string = data.access_token;
      setCookie(ACCESS_TOKEN_KEY, newToken);

      // Giải phóng queue
      pendingQueue.forEach(({ resolve }) => resolve(newToken));
      pendingQueue = [];

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      pendingQueue.forEach(({ reject }) => reject(refreshError));
      pendingQueue = [];
      // Refresh thất bại → xoá token, redirect về login
      deleteCookie(ACCESS_TOKEN_KEY);
      deleteCookie(REFRESH_TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Cookie helpers (chạy trên browser) ──────────────
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
