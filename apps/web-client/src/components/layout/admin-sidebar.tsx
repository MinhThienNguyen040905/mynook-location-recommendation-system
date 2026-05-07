'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Flag,
  LogOut,
  ChevronRight,
  ListChecks,
  Tag,
  MapPin,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
  { label: 'Người dùng', path: '/admin/users', icon: Users },
  { label: 'Danh sách quán', path: '/admin/venues', icon: ListChecks },
  { label: 'Import Maps', path: '/admin/imports', icon: ClipboardList },
  { label: 'Loại quán', path: '/admin/categories', icon: Tag },
  { label: 'Vị trí', path: '/admin/locations', icon: MapPin },
  { label: 'Báo cáo', path: '/admin/reports', icon: Flag },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function handleLogout() {
    document.cookie = 'access_token=; Max-Age=0; path=/';
    document.cookie = 'user_role=; Max-Age=0; path=/';
    window.location.href = '/';
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col self-stretch border-r border-slate-200 bg-white">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ label, path, icon: Icon }) => {
          const active =
            pathname === path ||
            (path !== '/admin' &&
              path !== '/admin/venues' &&
              pathname.startsWith(path)) ||
            (path === '/admin/venues' && pathname === '/admin/venues');
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all group',
                active
                  ? 'bg-nook-olive text-white shadow-sm shadow-nook-olive/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                {label}
              </div>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
