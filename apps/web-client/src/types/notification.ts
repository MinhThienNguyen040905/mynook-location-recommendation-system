export type NotificationType = 'review_reply' | 'promo' | 'system' | 'reminder';

export interface Notification {
  id: string;
  account_id: string;
  title: string;
  message: string;
  type: NotificationType;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
}
