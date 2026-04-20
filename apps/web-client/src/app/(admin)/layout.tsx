'use client';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Navbar } from '@/components/layout/navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex min-h-[calc(100vh-5rem)]">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
