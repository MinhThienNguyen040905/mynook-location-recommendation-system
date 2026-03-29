'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // replaces useNavigate
import { Bell, Settings, Utensils } from 'lucide-react';

export function OwnerHeader() {
  const router = useRouter(); // replaces const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between border-b border-primary/10 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* href replaces to */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-primary">
            <Utensils className="size-8" />
          </div>
          <h2 className="text-slate-900 text-xl font-bold tracking-tight">MyNook</h2>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-primary/5 transition-colors">
          <Bell className="size-5" />
        </button>
        <button className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-primary/5 transition-colors">
          <Settings className="size-5" />
        </button>

        {/* Avatar — navigate("/owner-profile") → router.push("/dashboard") */}
        <button
          onClick={() => router.push('/dashboard')}
          className="size-10 rounded-full bg-cover bg-center border-2 border-primary/20 overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
          style={{ backgroundImage: 'url("https://picsum.photos/seed/owner-avatar/100/100")' }}
        >
          <span className="sr-only">Owner Profile</span>
        </button>
      </div>
    </header>
  );
}
