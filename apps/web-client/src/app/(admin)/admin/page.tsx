'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Store, Flag, Eye, Bell, Send, TrendingUp, Star, MapPin, Loader2,
} from 'lucide-react';
import { getDashboard } from '@/lib/api/admin';
import { SendNotificationModal } from '@/components/admin/send-notification-modal';

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('vi-VN');
}

function hasError<T>(v: T | { error: string } | undefined): v is { error: string } {
  return !!v && typeof v === 'object' && 'error' in (v as object);
}

export default function AdminDashboardPage() {
  const [showBroadcast, setShowBroadcast] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboard,
    refetchOnWindowFocus: false,
  });

  const accounts = data && !hasError(data.accounts) ? data.accounts : null;
  const venues = data && !hasError(data.venues) ? data.venues : null;
  const interaction = data && !hasError(data.interaction) ? data.interaction : null;
  const reviewReports = data && !hasError(data.review_reports) ? data.review_reports : null;
  const venueReports = data && !hasError(data.venue_reports) ? data.venue_reports : null;

  const pendingReports = (reviewReports?.pending ?? 0) + (venueReports?.pending ?? 0);

  const STATS = [
    { label: 'Tổng người dùng', value: formatNumber(accounts?.total), sub: `+${accounts?.recent_30d ?? 0} trong 30 ngày`, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Venue đang hoạt động', value: formatNumber(venues?.active), sub: `${venues?.inactive ?? 0} vô hiệu / ${venues?.community ?? 0} cộng đồng`, icon: Store, color: 'bg-nook-olive/10 text-nook-olive' },
    { label: 'Báo cáo chờ xử lý', value: formatNumber(pendingReports), sub: `${reviewReports?.pending ?? 0} review · ${venueReports?.pending ?? 0} venue`, icon: Flag, color: 'bg-red-50 text-red-500' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">Tổng quan hệ thống</h1>
          <p className="text-slate-500 mt-1">Chào mừng trở lại, Admin. Đây là tình trạng hiện tại.</p>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-nook-olive text-white text-sm font-bold rounded-xl hover:bg-nook-olive/90 transition-colors shadow-sm"
        >
          <Bell size={16} />
          Gửi thông báo tổng
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-400 py-12 justify-center">
          <Loader2 size={18} className="animate-spin" /> Đang tải thống kê...
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          Không tải được dashboard. Hãy đảm bảo API Gateway đang chạy ở port 3001 và bạn đăng nhập bằng tài khoản admin.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                  <s.icon size={20} />
                </div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
                <div className="text-xs font-semibold text-slate-400 mt-2">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Type breakdown + interaction */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-800">Phân bố tài khoản & tương tác</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Mini label="Customer" value={accounts?.by_type.customer} />
                <Mini label="Owner" value={accounts?.by_type.owner} />
                <Mini label="Admin" value={accounts?.by_type.admin} />
                <Mini label="Active / Inactive" value={`${accounts?.active ?? 0} / ${accounts?.inactive ?? 0}`} />
                <Mini label="Tổng reviews" value={interaction?.total_reviews} icon={<Star size={13} />} />
                <Mini label="Reviews 30 ngày" value={interaction?.reviews_recent_30d} />
                <Mini label="Favorites" value={interaction?.total_favorites} />
                <Mini label="⭐ Rating TB" value={interaction?.average_rating?.toFixed(2)} />
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-5">Thao tác nhanh</h2>
              <div className="space-y-3">
                <Link href="/admin/reports" className="flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Flag size={18} className="text-red-500" />
                    <div>
                      <p className="text-sm font-bold text-red-700">{pendingReports} báo cáo cần xử lý</p>
                      <p className="text-xs text-red-500">Review + Venue</p>
                    </div>
                  </div>
                  <Eye size={16} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/admin/users" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-800">Quản lý tài khoản</p>
                      <p className="text-xs text-blue-500">{formatNumber(accounts?.total)} tài khoản</p>
                    </div>
                  </div>
                  <Eye size={16} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <button
                  onClick={() => setShowBroadcast(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-nook-olive/10 hover:bg-nook-olive/20 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-nook-olive" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-nook-olive">Gửi thông báo tổng</p>
                      <p className="text-xs text-nook-olive/60">Broadcast toàn hệ thống</p>
                    </div>
                  </div>
                  <Send size={16} className="text-nook-olive/50 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Hot venues + popular areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-nook-olive" />
                  <h2 className="font-bold text-slate-800">Top venue hot nhất</h2>
                </div>
                <Link href="/admin/venues" className="text-xs font-bold text-nook-olive hover:underline">Xem tất cả</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {(venues?.top_hot ?? []).slice(0, 8).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{v.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {v.district ? `${v.district}, ` : ''}{v.city}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-1 justify-end">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {v.rating_avg?.toFixed(1) ?? '0.0'}
                      </p>
                      <p className="text-xs text-slate-400">{v.review_count} reviews</p>
                    </div>
                  </div>
                ))}
                {(!venues?.top_hot || venues.top_hot.length === 0) && (
                  <div className="px-6 py-8 text-center text-sm text-slate-400">Chưa có venue nào.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <h2 className="font-bold text-slate-800">Khu vực phổ biến</h2>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {(venues?.popular_areas ?? []).slice(0, 10).map((a, i) => (
                  <div key={`${a.district}-${a.city}-${i}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.district ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.city}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                      {a.venue_count} venue
                    </span>
                  </div>
                ))}
                {(!venues?.popular_areas || venues.popular_areas.length === 0) && (
                  <div className="px-6 py-8 text-center text-sm text-slate-400">Chưa có dữ liệu khu vực.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showBroadcast && <SendNotificationModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}

function Mini({
  label, value, icon,
}: { label: string; value: number | string | undefined; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
        {icon}{label}
      </p>
      <p className="text-lg font-bold text-slate-800">
        {value === undefined || value === null || value === '' ? '—' : value}
      </p>
    </div>
  );
}
