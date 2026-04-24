'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Star, Verified, Edit3, Check, X,
  User, Link as LinkIcon, MapPin,
  TrendingUp, Store, Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatAddress } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { updateProfile } from '@/lib/api/auth';
import { uploadMedia } from '@/lib/api/upload';
import { getMyVenues } from '@/lib/api/venues';
import { AddVenueModal } from '@/components/dashboard/add-venue-modal';
import { Skeleton } from '@/components/ui/skeleton';
import type { Venue } from '@/types/venue';

/* ── Sub-components ──────────────────────────────────────────── */
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

function DashboardSkeleton() {
  return (
    <div>
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <Skeleton className="h-28 w-full" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-5">
            <Skeleton className="size-20 rounded-2xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      setForm({
        full_name: user.full_name ?? '',
        phone_number: user.phone_number ?? '',
      });
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    getMyVenues()
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setVenuesLoading(false));
  }, [user]);

  if (authLoading || !user) return <DashboardSkeleton />;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        full_name: form.full_name || undefined,
        phone_number: form.phone_number || undefined,
      });
      setUser(updated);
      setIsEditing(false);
    } catch {
      // TODO: toast error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      full_name: user.full_name ?? '',
      phone_number: user.phone_number ?? '',
    });
    setIsEditing(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setAvatarUploading(true);
    try {
      const [result] = await uploadMedia([file]);
      const updated = await updateProfile({ avatar_url: result.url });
      setUser(updated);
    } catch {
      // TODO: toast error
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleVenueAdded = () => {
    setShowAddVenue(false);
    // Refresh venue list
    getMyVenues()
      .then(setVenues)
      .catch(() => {});
  };

  const totalReviews = venues.reduce((sum, v) => sum + v.review_count, 0);
  const avgRating = venues.length > 0
    ? (venues.reduce((sum, v) => sum + v.rating_avg, 0) / venues.length).toFixed(1)
    : '0';

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
              <img
                src={user.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name ?? user.email)}&size=200&background=ea580c&color=fff`}
                alt={user.full_name ?? 'Avatar'}
                className="size-20 rounded-2xl border-4 border-white shadow-lg object-cover"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 size-7 bg-orange-600 rounded-lg flex items-center justify-center shadow hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {avatarUploading
                  ? <span className="size-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Camera size={13} className="text-white" />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
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
            <h1 className="text-2xl font-bold text-gray-900">{user.full_name ?? 'Chưa cập nhật tên'}</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
              <Verified size={12} className="fill-current" /> Verified Owner
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
            <span>Tham gia {formatJoinDate(user.created_at)}</span>
          </div>

          {isEditing ? (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ tên</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="nook-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số điện thoại</label>
                  <input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="nook-input" />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm shadow-orange-200 disabled:opacity-50"
                >
                  <Check size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X size={16} /> Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-1">
              <span className="flex items-center gap-1.5"><User size={13} className="text-orange-500" />{user.email}</span>
              {user.phone_number && (
                <span className="flex items-center gap-1.5">{user.phone_number}</span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Store}      value={venues.length}  label="Venues quản lý" />
        <StatCard icon={TrendingUp} value={totalReviews}   label="Tổng đánh giá" />
        <StatCard icon={Star}       value={avgRating}      label="Rating trung bình" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Info ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
              <User size={16} className="text-orange-500" /> Thông tin cá nhân
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ tên</label>
                <div className="nook-input bg-gray-50 text-gray-500 cursor-default">{user.full_name || '—'}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                <div className="nook-input bg-gray-50 text-gray-400 cursor-not-allowed">{user.email}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Điện thoại</label>
                <div className="nook-input bg-gray-50 text-gray-500 cursor-default">{user.phone_number || '—'}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loại tài khoản</label>
                <div className="nook-input bg-gray-50 text-gray-500 cursor-default capitalize">{user.type}</div>
              </div>
            </div>
          </div>
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
              {venuesLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))
              ) : venues.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Store size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Chưa có venue nào</p>
                  <p className="text-xs mt-1">Thêm venue đầu tiên của bạn</p>
                </div>
              ) : (
                venues.map(venue => (
                  <div key={venue.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:border-orange-200 transition-all">
                    {venue.media && venue.media.length > 0 ? (
                      <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url('${venue.media[0]}')` }} />
                    ) : (
                      <div className="h-28 bg-gradient-to-r from-orange-100 to-orange-50 flex items-center justify-center">
                        <Store size={32} className="text-orange-300" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm truncate">{venue.name}</h3>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />{formatAddress(venue) || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-lg shrink-0 ml-2">
                          <Star size={11} className="text-orange-500 fill-current" />
                          <span className="text-xs font-bold text-orange-600">{venue.rating_avg.toFixed(1)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/venue?id=${venue.id}`)}
                        className="w-full py-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white font-bold rounded-xl transition-all text-xs"
                      >
                        Quản lý Venue →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Add Venue Modal ── */}
      <AnimatePresence>
        {showAddVenue && (
          <AddVenueModal onClose={handleVenueAdded} />
        )}
      </AnimatePresence>
    </div>
  );
}
