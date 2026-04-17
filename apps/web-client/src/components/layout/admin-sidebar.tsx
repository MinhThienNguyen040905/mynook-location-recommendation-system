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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NookLogo } from '@/components/shared/nook-logo';

const NAV = [
  { label: 'Tổng quan',       path: '/admin',                icon: LayoutDashboard },
  { label: 'Người dùng',      path: '/admin/users',          icon: Users           },
  { label: 'Danh sách quán',  path: '/admin/venues/list',    icon: ListChecks      },
  { label: 'Báo cáo',         path: '/admin/reports',        icon: Flag            },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function handleLogout() {
    document.cookie = 'access_token=; Max-Age=0; path=/';
    document.cookie = 'user_role=; Max-Age=0; path=/';
    window.location.href = '/';
  }

  return (
    <aside className="w-64 shrink-0 bg-slate-900 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <Link href="/admin">
          <NookLogo size="md" variant="blue" strokeColor="#0f172a" />
        </Link>
        <span className="mt-2 block text-xs font-bold text-slate-500 uppercase tracking-widest">
          Admin Panel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || (path !== '/admin' && path !== '/admin/venues' && pathname.startsWith(path)) || (path === '/admin/venues' && pathname === '/admin/venues');
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-nook-olive text-white shadow-lg shadow-nook-olive/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
