'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, Menu, Tag, BarChart3 } from 'lucide-react';

const tabs = [
  { label: 'General Info',      icon: Info,     href: '/dashboard/venue'     },
  { label: 'Menu Management',   icon: Menu,     href: '/dashboard/menu'      },
  { label: 'Special Offers',    icon: Tag,      href: '/dashboard/offers'    },
  { label: 'Venue Analysis',    icon: BarChart3, href: '/dashboard/analytics' },
];

/**
 * Tab bar dùng cho các trang quản lý quán (venue/menu/offers/analytics).
 * usePathname() thay thế activeTab state — URL là nguồn sự thật duy nhất.
 */
export function VenueManagerTabs() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-primary/10 gap-8 overflow-x-auto no-scrollbar mb-8">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 border-b-2 pb-4 px-2 whitespace-nowrap text-sm font-bold uppercase tracking-wider transition-all ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-primary'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
