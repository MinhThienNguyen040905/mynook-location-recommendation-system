import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { Notification } from '@/types/notification';

/** Lấy danh sách thông báo */
export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>(API_ENDPOINTS.NOTIFICATIONS.LIST);
  return data;
}

/** Đếm số thông báo chưa đọc */
export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  return data.count;
}

/** Đánh dấu một thông báo đã đọc */
export async function markAsRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  return data;
}

/** Đánh dấu tất cả đã đọc */
export async function markAllAsRead(): Promise<void> {
  await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
}
