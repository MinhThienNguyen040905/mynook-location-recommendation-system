'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, Store, UtensilsCrossed, Tag, BarChart3, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NookLogo } from '@/components/shared/nook-logo';

const NAV_ITEMS = [
  { label: 'Hồ sơ của tôi',  href: '/dashboard',            icon: User            },
  { label: 'Quản lý Quán',   href: '/dashboard/venue',      icon: Store           },
  { label: 'Thực đơn',       href: '/dashboard/menu',       icon: UtensilsCrossed },
  { label: 'Ưu đãi',         href: '/dashboard/offers',     icon: Tag             },
  { label: 'Phân tích',      href: '/dashboard/analytics',  icon: BarChart3       },
  { label: 'Cài đặt',        href: '/dashboard/settings',   icon: Settings        },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-orange-600 flex flex-col z-40">

      {/* ── Logo ── */}
      <div className="flex items-center px-6 py-5 border-b border-orange-500/50">
        <NookLogo size="md" variant="white" />
      </div>

      {/* ── Label ── */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Quản lý</p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-orange-100 hover:bg-white/15 hover:text-white',
              )}
            >
              <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-orange-600' : 'text-orange-200')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: User info ── */}
      <div className="px-4 py-4 border-t border-orange-500/40">
        <div className="flex items-center gap-3">
          <img
            src="https://picsum.photos/seed/owner-avatar/100/100"
            alt="Owner"
            className="size-8 rounded-full border-2 border-white/40 object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">Alex Rivera</p>
            <p className="text-[10px] text-orange-200">Verified Owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
