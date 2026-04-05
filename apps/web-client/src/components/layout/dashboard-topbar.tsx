'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  User, Store, UtensilsCrossed, Tag, BarChart3,
  Settings, ChevronDown, LogOut, Home,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { logout as logoutApi } from '@/lib/api/auth';
import { NotificationDropdown } from '@/components/shared/notification-dropdown';

/* Map route → label + icon hiển thị trên topbar */
const ROUTE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  '/dashboard':           { label: 'Hồ sơ của tôi', Icon: User            },
  '/dashboard/venue':     { label: 'Quản lý Quán',  Icon: Store           },
  '/dashboard/menu':      { label: 'Thực đơn',      Icon: UtensilsCrossed },
  '/dashboard/offers':    { label: 'Ưu đãi',        Icon: Tag             },
  '/dashboard/analytics': { label: 'Phân tích',     Icon: BarChart3       },
  '/dashboard/settings':  { label: 'Cài đặt',       Icon: Settings        },
};

export function DashboardTopbar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const meta = ROUTE_META[pathname] ?? { label: 'Dashboard', Icon: User };
  const { label, Icon } = meta;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logoutApi();
    useAuthStore.getState().reset();
    window.location.href = '/';
  }

  const avatarUrl = user?.avatar_url
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? user?.email ?? 'U')}&size=100&background=ea580c&color=fff`;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">

      {/* ── Left: current page badge ── */}
      <div className="flex items-center gap-2 bg-orange-600 text-white px-4 py-1.5 rounded-lg shadow-sm shadow-orange-200">
        <Icon className="size-4" />
        <span className="font-semibold text-sm">{label}</span>
      </div>

      {/* ── Right: actions + user ── */}
      <div className="flex items-center gap-1">
        <a href="/" className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Về trang chủ">
          <Home className="size-5" />
        </a>
        <NotificationDropdown
          iconClass="text-gray-400 hover:text-orange-600 hover:bg-orange-50"
          badgeClass="bg-orange-500"
        />
        <button className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
          <Settings className="size-5" />
        </button>

        {/* User dropdown */}
        <div className="relative ml-1" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <img
              src={avatarUrl}
              alt="Avatar"
              className="size-7 rounded-full border-2 border-orange-300 object-cover"
            />
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user?.full_name ?? 'Owner'}
            </span>
            <ChevronDown className="size-4 text-orange-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-gray-50 mb-1">
                <p className="text-sm font-semibold text-gray-800">{user?.full_name ?? 'Owner'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <a href="/dashboard"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                <User className="size-4 text-gray-400" /> Hồ sơ của tôi
              </a>
              <a href="/dashboard/settings"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                <Settings className="size-4 text-gray-400" /> Cài đặt
              </a>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <LogOut className="size-4" /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
