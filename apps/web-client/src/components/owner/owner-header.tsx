'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Utensils } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { NotificationDropdown } from '@/components/shared/notification-dropdown';

export function OwnerHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const avatarUrl = user?.avatar_url
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? user?.email ?? 'U')}&size=100&background=ea580c&color=fff`;

  return (
    <header className="flex items-center justify-between border-b border-primary/10 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-primary">
            <Utensils className="size-8" />
          </div>
          <h2 className="text-slate-900 text-xl font-bold tracking-tight">MyNook</h2>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown
          iconClass="text-slate-600 hover:bg-primary/5"
          badgeClass="bg-orange-500"
        />
        <button className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-primary/5 transition-colors">
          <Settings className="size-5" />
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="size-10 rounded-full bg-cover bg-center border-2 border-primary/20 overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
          style={{ backgroundImage: `url("${avatarUrl}")` }}
        >
          <span className="sr-only">Owner Profile</span>
        </button>
      </div>
    </header>
  );
}
