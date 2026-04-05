'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Info, MessageSquare, Tag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/api/notifications';
import type { Notification, NotificationType } from '@/types/notification';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  system:       { icon: Info,           color: 'text-blue-500 bg-blue-50' },
  review_reply: { icon: MessageSquare,  color: 'text-orange-500 bg-orange-50' },
  promo:        { icon: Tag,            color: 'text-green-500 bg-green-50' },
  reminder:     { icon: Clock,          color: 'text-purple-500 bg-purple-50' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

interface NotificationDropdownProps {
  /** Tailwind color classes for the bell icon */
  iconClass?: string;
  /** Tailwind color classes for the unread badge */
  badgeClass?: string;
}

export function NotificationDropdown({
  iconClass = 'text-nook-ink/60 hover:text-nook-olive hover:bg-nook-olive/10',
  badgeClass = 'bg-red-500',
}: NotificationDropdownProps) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch unread count on mount + periodic poll
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]);

  if (!user) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('p-2 rounded-lg transition-colors relative', iconClass)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1',
            badgeClass,
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <CheckCheck size={14} /> Đọc tất cả
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center">
                  <div className="size-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0',
                        !notif.is_read && 'bg-blue-50/30',
                      )}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                    >
                      <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', config.color)}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm leading-snug',
                            notif.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold',
                          )}>
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[11px] text-gray-300 mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
