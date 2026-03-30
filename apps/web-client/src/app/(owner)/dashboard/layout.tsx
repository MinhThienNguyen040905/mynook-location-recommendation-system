'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-nook-cream/30">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {!isRoot && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-nook-ink/50 hover:text-nook-olive transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Quay lại trang chủ
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
