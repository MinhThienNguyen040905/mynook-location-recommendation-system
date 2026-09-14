'use client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';

export function DemoBanner() {
  const user = useAuthStore(s => s.user);
  if (!user?.is_demo) return null;
  return (
    <aside aria-label="Chế độ dùng thử" className="border-b border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p><strong>Demo {user.type === 'owner' ? 'chủ quán' : 'khách hàng'}.</strong>{' '}
          {user.type === 'owner' ? 'Dashboard chỉ xem, với dữ liệu quán mẫu.' : 'Thử lưu yêu thích và viết đánh giá tại quán mẫu.'}
          {' '}Tài khoản dùng chung, không nhập thông tin cá nhân.</p>
        <div className="flex gap-4 font-medium text-orange-700">
          {user.demo_venue_id && <Link href={`/venues/${user.demo_venue_id}`} className="underline underline-offset-4">Đến quán mẫu</Link>}
          <Link href="/login" className="underline underline-offset-4">Đổi vai trò</Link>
        </div>
      </div>
    </aside>
  );
}
