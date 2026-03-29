'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Star, Verified, Edit3, Check, X,
  User, Link as LinkIcon, MapPin,
  BookOpen, TrendingUp, Store, Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { AddVenueModal } from '@/components/dashboard/add-venue-modal';

/* ── Mock data ───────────────────────────────────────────────── */
const OWNER = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  phone: '+1 (555) 000-1234',
  location: 'Manhattan, New York, NY',
  bio: 'Managing premier dining spaces in downtown Manhattan. Passionate about creating unique culinary experiences and fostering a welcoming atmosphere for all guests.',
  avatar: 'https://picsum.photos/seed/owner-profile/200/200',
  joinDate: 'Tháng 1, 2023',
  linkedin: 'https://linkedin.com/in/alexrivera',
  instagram: 'https://instagram.com/alex_venues',
  website: 'https://alexrivera.me',
  stats: { venues: 2, bookings: 14, rating: 4.9, reviews: 128 },
};

const VENUES = [
  { id: 'v1', name: 'The Greenery', location: 'Upper West Side, NY', rating: 4.9, img: 'https://picsum.photos/seed/greenery/600/300' },
  { id: 'v2', name: 'Urban Savor',  location: 'Chelsea, NY',         rating: 4.8, img: 'https://picsum.photos/seed/urbansavor/600/300' },
];

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
      <div className="flex items-center gap-3 mb-1">
        <Icon className="text-nook-olive" size={18} />
        <p className="text-2xl font-bold text-nook-olive">{value}</p>
      </div>
      <p className="text-sm text-nook-ink/60">{label}</p>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [isEditing, setIsEditing]   = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [form, setForm] = useState({
    name:      OWNER.name,
    phone:     OWNER.phone,
    location:  OWNER.location,
    bio:       OWNER.bio,
    linkedin:  OWNER.linkedin,
    instagram: OWNER.instagram,
    website:   OWNER.website,
  });

  return (
    <div>

      {/* ── Header card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6"
      >
        <div className="h-28 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-5">
            <div className="relative">
              <img src={OWNER.avatar} alt={OWNER.name}
                className="size-20 rounded-2xl border-4 border-white shadow-lg object-cover" />
              <button className="absolute -bottom-1 -right-1 size-7 bg-orange-600 rounded-lg flex items-center justify-center shadow hover:bg-orange-700 transition-colors">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                isEditing
                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                  : 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
              )}
            >
              <Edit3 size={15} />
              {isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
              <Verified size={12} className="fill-current" /> Verified Owner
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
            <MapPin size={13} className="text-orange-500" />{form.location}
            <span className="mx-1">·</span>
            <span>Tham gia {OWNER.joinDate}</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{form.bio}</p>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Store}      value={OWNER.stats.venues}   label="Venues quản lý" />
        <StatCard icon={BookOpen}   value={OWNER.stats.bookings} label="Đặt chỗ hôm nay" />
        <StatCard icon={TrendingUp} value={OWNER.stats.reviews}  label="Tổng đánh giá" />
        <StatCard icon={Star}       value={OWNER.stats.rating}   label="Rating trung bình" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Form ── */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
              <User size={16} className="text-orange-500" /> Thông tin cá nhân
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { label: 'Họ tên',     key: 'name',     type: 'text' },
                { label: 'Email',      key: 'email',    type: 'email', fixed: OWNER.email },
                { label: 'Điện thoại', key: 'phone',    type: 'tel' },
                { label: 'Địa chỉ',    key: 'location', type: 'text' },
              ] as const).map(({ label, key, type, fixed }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                  {key === 'email'
                    ? <div className="nook-input bg-gray-50 text-gray-400 cursor-not-allowed">{fixed}</div>
                    : <input type={type} value={form[key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        disabled={!isEditing}
                        className={cn('nook-input transition-all', !isEditing && 'bg-gray-50 text-gray-500 cursor-default')} />
                  }
                </div>
              ))}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giới thiệu</label>
                <textarea rows={3} value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  disabled={!isEditing}
                  className={cn('nook-input resize-none transition-all', !isEditing && 'bg-gray-50 text-gray-500 cursor-default')} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
              <LinkIcon size={16} className="text-orange-500" /> Liên kết mạng xã hội
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { label: 'LinkedIn',        key: 'linkedin'  },
                { label: 'Instagram',       key: 'instagram' },
                { label: 'Website cá nhân', key: 'website'   },
              ] as const).map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                  <input type="url" value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    disabled={!isEditing}
                    className={cn('nook-input transition-all', !isEditing && 'bg-gray-50 text-gray-500 cursor-default')} />
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <button onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm shadow-orange-200">
                <Check size={16} /> Lưu thay đổi
              </button>
              <button onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                <X size={16} /> Hủy
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Right: My Venues ── */}
        <div>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Store size={16} className="text-orange-500" /> Venues của tôi
              </h2>
              <button
                onClick={() => setShowAddVenue(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Plus size={13} /> Thêm venue
              </button>
            </div>
            <div className="p-4 space-y-4">
              {VENUES.map(venue => (
                <div key={venue.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:border-orange-200 transition-all">
                  <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url('${venue.img}')` }} />
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{venue.name}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} />{venue.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-lg shrink-0 ml-2">
                        <Star size={11} className="text-orange-500 fill-current" />
                        <span className="text-xs font-bold text-orange-600">{venue.rating}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard/venue')}
                      className="w-full py-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white font-bold rounded-xl transition-all text-xs"
                    >
                      Quản lý Venue →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Add Venue Modal ── */}
      <AnimatePresence>
        {showAddVenue && (
          <AddVenueModal onClose={() => setShowAddVenue(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
