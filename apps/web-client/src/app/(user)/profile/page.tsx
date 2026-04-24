'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Camera, Star, MapPin,
  Mail, Phone, Calendar, Edit3, Check, X,
  MessageSquare, HandHeart,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { updateProfile } from '@/lib/api/auth';
import { uploadMedia } from '@/lib/api/upload';
import { getMyContributions } from '@/lib/api/venues';
import { Skeleton } from '@/components/ui/skeleton';
import type { Venue } from '@/types/venue';
import { formatAddress } from '@/lib/utils';

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

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white rounded-3xl border border-nook-sand shadow-sm overflow-hidden mb-6">
        <Skeleton className="h-32 w-full" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Skeleton className="size-24 rounded-2xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-full mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
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
export default function UserProfilePage() {
  const router = useRouter();
  const { user, isLoading, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: '', phone_number: '' });
  const [activeTab, setActiveTab] = useState<'reviews' | 'contributions'>('reviews');
  const [contributions, setContributions] = useState<Venue[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name ?? '',
        phone_number: user.phone_number ?? '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'contributions' || !user) return;
    let cancelled = false;
    setContributionsLoading(true);
    getMyContributions()
      .then((data) => { if (!cancelled) setContributions(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setContributionsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, user]);

  if (isLoading || !user) return <ProfileSkeleton />;

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
                src={user.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name ?? user.email)}&size=200&background=4a5d23&color=fff`}
                alt={user.full_name ?? 'Avatar'}
                className="size-24 rounded-2xl border-4 border-white shadow-lg object-cover"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 size-7 bg-nook-olive rounded-lg flex items-center justify-center shadow-md hover:bg-nook-olive/90 transition-colors disabled:opacity-50"
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
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="nook-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nook-ink/50 uppercase tracking-wider">Số điện thoại</label>
                  <input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="nook-input" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-nook-olive text-white font-bold rounded-xl hover:bg-nook-olive/90 transition-colors text-sm disabled:opacity-50"
                >
                  <Check size={15} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-nook-sand text-nook-ink font-medium rounded-xl text-sm"
                >
                  <X size={15} /> Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-nook-ink mb-1">{user.full_name ?? 'Chưa cập nhật tên'}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-nook-ink/50 mt-3">
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-nook-olive" />{user.email}</span>
                {user.phone_number && (
                  <span className="flex items-center gap-1.5"><Phone size={14} className="text-nook-olive" />{user.phone_number}</span>
                )}
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-nook-olive" />Tham gia {formatJoinDate(user.created_at)}</span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard icon={MessageSquare} value={0} label="Đánh giá" />
        <StatCard icon={MapPin}        value={0} label="Đã ghé thăm" />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-3xl border border-nook-sand shadow-sm overflow-hidden">
        <div className="flex border-b border-nook-sand">
          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'reviews'
                ? 'border-nook-olive text-nook-olive'
                : 'border-transparent text-nook-ink/40 hover:text-nook-ink/60',
            )}
          >
            <Star size={15} />
            Đánh giá
          </button>
          <button
            onClick={() => setActiveTab('contributions')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'contributions'
                ? 'border-nook-olive text-nook-olive'
                : 'border-transparent text-nook-ink/40 hover:text-nook-ink/60',
            )}
          >
            <HandHeart size={15} />
            Đã đóng góp
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'reviews' && (
            <div className="py-12 text-center text-nook-ink/40">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Chưa có đánh giá nào</p>
              <Link href="/search" className="mt-4 inline-block text-sm text-nook-olive font-bold hover:underline">
                Tìm venue để đánh giá →
              </Link>
            </div>
          )}

          {activeTab === 'contributions' && (
            contributionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : contributions.length === 0 ? (
              <div className="py-12 text-center text-nook-ink/40">
                <HandHeart size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Chưa đóng góp địa điểm nào</p>
                <Link href="/search" className="mt-4 inline-block text-sm text-nook-olive font-bold hover:underline">
                  Đóng góp địa điểm mới →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contributions.map((venue) => (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="flex gap-4 p-4 rounded-2xl border border-nook-sand hover:border-nook-olive/30 hover:shadow-sm transition-all group"
                  >
                    <div className="size-20 rounded-xl overflow-hidden shrink-0 bg-nook-sand">
                      {venue.media?.[0] ? (
                        <img src={venue.media[0]} alt={venue.name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <MapPin size={24} className="text-nook-ink/20" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-nook-ink group-hover:text-nook-olive transition-colors truncate">
                        {venue.name}
                      </h4>
                      <p className="text-sm text-nook-ink/50 truncate mt-0.5">
                        <MapPin size={12} className="inline mr-1" />
                        {formatAddress(venue)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-nook-ink/40">
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-nook-olive" fill="currentColor" />
                          {venue.rating_avg.toFixed(1)}
                        </span>
                        <span>{venue.review_count} đánh giá</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
