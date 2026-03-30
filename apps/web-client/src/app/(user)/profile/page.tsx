'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Camera, Star, MapPin, BookOpen, Heart,
  Mail, Phone, Calendar, Edit3, Check, X,
  MessageSquare, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/* ── Mock data ───────────────────────────────────────────────── */
const USER = {
  name: 'Nguyen Minh Thien',
  email: 'thien.nguyen@email.com',
  phone: '+84 091 234 5678',
  joinDate: 'Tháng 3, 2024',
  avatar: 'https://picsum.photos/seed/user-profile/200/200',
  bio: 'Người yêu thích khám phá những góc nhỏ yên tĩnh để làm việc và đọc sách. Luôn tìm kiếm nơi có cà phê ngon và wifi ổn định.',
  location: 'TP. Hồ Chí Minh',
  stats: { reviews: 24, visited: 38, bookings: 12, favorites: 17 },
};

const RECENT_REVIEWS = [
  { id: '1', venue: 'The Greenery Café', rating: 5, date: '20/03/2026', text: 'Không gian tuyệt vời, rất yên tĩnh để làm việc. Cà phê ngon và nhân viên thân thiện.', image: 'https://picsum.photos/seed/greenery/80/80' },
  { id: '2', venue: 'Urban Library', rating: 4, date: '15/03/2026', text: 'Thư viện thoáng mát, nhiều ổ điện cắm. Tuy nhiên hơi ồn vào buổi chiều.', image: 'https://picsum.photos/seed/library/80/80' },
  { id: '3', venue: 'Nook & Corner', rating: 5, date: '08/03/2026', text: 'Địa điểm yêu thích của mình! Ánh sáng tự nhiên, nhạc nền nhẹ nhàng, hoàn hảo.', image: 'https://picsum.photos/seed/nookcorner/80/80' },
];

/* ── Sub-components ──────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-nook-sand text-center shadow-sm">
      <div className="w-10 h-10 bg-nook-olive/10 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Icon className="text-nook-olive" size={20} />
      </div>
      <p className="text-2xl font-bold text-nook-ink">{value}</p>
      <p className="text-xs text-nook-ink/50 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: typeof RECENT_REVIEWS[0] }) {
  return (
    <div className="bg-white rounded-2xl border border-nook-sand p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <img src={review.image} alt={review.venue} className="size-14 rounded-xl object-cover shrink-0 border border-nook-sand" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-nook-ink text-sm truncate">{review.venue}</h4>
            <span className="text-xs text-nook-ink/40 shrink-0">{review.date}</span>
          </div>
          <div className="flex gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className={cn(i < review.rating ? 'text-nook-olive fill-current' : 'text-nook-sand fill-current')} />
            ))}
          </div>
          <p className="text-sm text-nook-ink/70 leading-relaxed line-clamp-2">{review.text}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function UserProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'reviews' | 'bookings' | 'favorites'>('reviews');
  const [form, setForm] = useState({ name: USER.name, phone: USER.phone, bio: USER.bio, location: USER.location });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

      {/* ── Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-nook-sand shadow-sm overflow-hidden mb-6"
      >
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-nook-olive via-nook-olive/80 to-nook-olive/60 relative">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={USER.avatar}
                alt={USER.name}
                className="size-24 rounded-2xl border-4 border-white shadow-lg object-cover"
              />
              <button className="absolute -bottom-1 -right-1 size-7 bg-nook-olive rounded-lg flex items-center justify-center shadow-md hover:bg-nook-olive/90 transition-colors">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                isEditing
                  ? 'bg-nook-sand text-nook-ink border-nook-sand'
                  : 'bg-nook-olive text-white border-nook-olive hover:bg-nook-olive/90'
              )}
            >
              <Edit3 size={15} />
              {isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa'}
            </button>
          </div>

          {/* Info — view or edit */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nook-ink/50 uppercase tracking-wider">Họ tên</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="nook-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nook-ink/50 uppercase tracking-wider">Số điện thoại</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="nook-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nook-ink/50 uppercase tracking-wider">Địa chỉ</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="nook-input" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-nook-ink/50 uppercase tracking-wider">Giới thiệu</label>
                <textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="nook-input resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-nook-olive text-white font-bold rounded-xl hover:bg-nook-olive/90 transition-colors text-sm"
                >
                  <Check size={15} /> Lưu thay đổi
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-nook-sand text-nook-ink font-medium rounded-xl text-sm"
                >
                  <X size={15} /> Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-nook-ink mb-1">{form.name}</h1>
              <p className="text-nook-ink/60 text-sm mb-3 leading-relaxed">{form.bio}</p>
              <div className="flex flex-wrap gap-4 text-sm text-nook-ink/50">
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-nook-olive" />{USER.email}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-nook-olive" />{form.phone}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-nook-olive" />{form.location}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-nook-olive" />Tham gia {USER.joinDate}</span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} value={USER.stats.reviews}   label="Đánh giá" />
        <StatCard icon={MapPin}        value={USER.stats.visited}   label="Đã ghé thăm" />
        <StatCard icon={Clock}         value={USER.stats.bookings}  label="Đặt chỗ" />
        <StatCard icon={Heart}         value={USER.stats.favorites} label="Yêu thích" />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-3xl border border-nook-sand shadow-sm overflow-hidden">
        <div className="flex border-b border-nook-sand">
          {([
            { key: 'reviews',   label: 'Đánh giá', icon: Star },
            { key: 'bookings',  label: 'Đặt chỗ',  icon: Clock },
            { key: 'favorites', label: 'Yêu thích', icon: Heart },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === key
                  ? 'border-nook-olive text-nook-olive'
                  : 'border-transparent text-nook-ink/50 hover:text-nook-ink'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {RECENT_REVIEWS.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
          {activeTab === 'bookings' && (
            <div className="py-12 text-center text-nook-ink/40">
              <Clock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Chưa có đặt chỗ nào</p>
              <Link href="/search" className="mt-4 inline-block text-sm text-nook-olive font-bold hover:underline">
                Tìm venue ngay →
              </Link>
            </div>
          )}
          {activeTab === 'favorites' && (
            <div className="py-12 text-center text-nook-ink/40">
              <Heart size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Chưa có venue yêu thích</p>
              <Link href="/search" className="mt-4 inline-block text-sm text-nook-olive font-bold hover:underline">
                Khám phá venues →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
