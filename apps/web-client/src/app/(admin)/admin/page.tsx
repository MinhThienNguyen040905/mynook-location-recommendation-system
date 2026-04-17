'use client';

import { useState } from 'react';
import { Users, Store, Flag, Eye, Bell, X, Send, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATS = [
  { label: 'Tổng người dùng',      value: '2,481', delta: '+12%',      icon: Users, color: 'bg-blue-50 text-blue-600'        },
  { label: 'Venue đang hoạt động', value: '134',   delta: '+5%',       icon: Store, color: 'bg-nook-olive/10 text-nook-olive' },
  { label: 'Báo cáo mở',          value: '3',     delta: 'cần xử lý', icon: Flag,  color: 'bg-red-50 text-red-500'           },
];

const RECENT_USERS = [
  { id: 1,  name: 'Nguyễn Văn A', email: 'a@gmail.com',   role: 'user',  status: 'active',  joined: '1 giờ trước'  },
  { id: 2,  name: 'Trần Thị B',   email: 'b@gmail.com',   role: 'owner', status: 'active',  joined: '3 giờ trước'  },
  { id: 3,  name: 'Lê Minh C',    email: 'c@gmail.com',   role: 'user',  status: 'banned',  joined: 'Hôm qua'      },
  { id: 4,  name: 'Phạm Thu D',   email: 'd@gmail.com',   role: 'user',  status: 'active',  joined: 'Hôm qua'      },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  banned: 'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động', banned: 'Bị khoá',
};

/* ── Simple bar chart ────────────────────────────────────────── */
const WEEKLY = [
  { day: 'T2', users: 34, venues: 2 },
  { day: 'T3', users: 48, venues: 4 },
  { day: 'T4', users: 29, venues: 1 },
  { day: 'T5', users: 61, venues: 3 },
  { day: 'T6', users: 72, venues: 5 },
  { day: 'T7', users: 55, venues: 2 },
  { day: 'CN', users: 40, venues: 1 },
];
const maxUsers = Math.max(...WEEKLY.map(d => d.users));

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: 'Tất cả người dùng' },
  { value: 'customer', label: 'Khách hàng (Customer)' },
  { value: 'owner',    label: 'Chủ venue (Owner)' },
];

const TYPE_OPTIONS = [
  { value: 'system',      label: 'Hệ thống' },
  { value: 'promotion',   label: 'Khuyến mãi' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'update',      label: 'Cập nhật' },
];

/* ── Broadcast Notification Modal ────────────────────────────── */
function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [audience, setAudience] = useState('all');
  const [type, setType]         = useState('system');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    // TODO: gọi API POST /api/notifications/broadcast
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setTimeout(onClose, 1500);
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-nook-olive/10 rounded-xl flex items-center justify-center">
              <Bell size={18} className="text-nook-olive" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Gửi thông báo tổng</h2>
              <p className="text-xs text-slate-400">Thông báo sẽ được gửi đến tất cả người dùng được chọn</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Audience & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Đối tượng</label>
              <div className="relative">
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-nook-olive/30 focus:border-nook-olive pr-8"
                >
                  {AUDIENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Loại thông báo</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-nook-olive/30 focus:border-nook-olive pr-8"
                >
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tiêu đề</label>
            <input
              type="text"
              placeholder="Nhập tiêu đề thông báo..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-nook-olive/30 focus:border-nook-olive"
            />
            <p className="text-right text-[11px] text-slate-300">{title.length}/100</p>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nội dung</label>
            <textarea
              placeholder="Nhập nội dung thông báo..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-nook-olive/30 focus:border-nook-olive resize-none"
            />
            <p className="text-right text-[11px] text-slate-300">{message.length}/500</p>
          </div>

          {/* Preview chip */}
          {(title || message) && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Xem trước</p>
              <p className="text-sm font-semibold text-slate-800">{title || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{message || '—'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400">
            Gửi đến: <span className="font-semibold text-slate-600">{AUDIENCE_OPTIONS.find(o => o.value === audience)?.label}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSend}
              disabled={sending || sent || !title.trim() || !message.trim()}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all',
                sent
                  ? 'bg-green-500 text-white'
                  : 'bg-nook-olive text-white hover:bg-nook-olive/90 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {sent ? (
                <>'✓ Đã gửi'</>
              ) : sending ? (
                <><Loader2 size={15} className="animate-spin" /> Đang gửi...</>
              ) : (
                <><Send size={15} /> Gửi thông báo</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">Tổng quan hệ thống</h1>
          <p className="text-slate-500 mt-1">Chào mừng trở lại, Admin. Đây là tình trạng hôm nay.</p>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-nook-olive text-white text-sm font-bold rounded-xl hover:bg-nook-olive/90 transition-colors shadow-sm"
        >
          <Bell size={16} />
          Gửi thông báo tổng
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-xs font-semibold text-nook-olive mt-2">{s.delta} so với tuần trước</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-800">Đăng ký trong tuần</h2>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-nook-olive inline-block" />Người dùng</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Venue</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {WEEKLY.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-nook-olive rounded-t-md transition-all"
                    style={{ height: `${(d.users / maxUsers) * 100}px` }}
                    title={`${d.users} users`}
                  />
                  <div
                    className="w-full bg-blue-400 rounded-b-md transition-all"
                    style={{ height: `${(d.venues / 5) * 24}px` }}
                    title={`${d.venues} venues`}
                  />
                </div>
                <span className="text-xs text-slate-400">{d.day}</span>
              </div>
            ))}
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
                  <p className="text-sm font-bold text-red-700">3 báo cáo mới</p>
                  <p className="text-xs text-red-500">Cần xử lý</p>
                </div>
              </div>
              <Eye size={16} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/admin/users" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Quản lý users</p>
                  <p className="text-xs text-blue-500">2,481 tài khoản</p>
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
                  <p className="text-xs text-nook-olive/60">Thông báo toàn hệ thống</p>
                </div>
              </div>
              <Send size={16} className="text-nook-olive/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent users */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Người dùng mới</h2>
            <Link href="/admin/users" className="text-xs font-bold text-nook-olive hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {RECENT_USERS.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://picsum.photos/seed/admin-user${u.id}/80/80`}
                    alt={u.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email} · {u.joined}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{u.role}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}
