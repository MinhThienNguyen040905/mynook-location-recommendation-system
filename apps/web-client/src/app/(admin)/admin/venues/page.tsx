'use client';

import { useState } from 'react';
import {
  MapPin, Search, Eye, X, Trash2, RotateCcw, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Star, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listAdminVenues, adminSoftDeleteVenue, adminRestoreVenue, adminHardDeleteVenue,
  type ListAdminVenuesParams,
} from '@/lib/api/admin';
import type { Venue } from '@/types/venue';
import { formatAddress, formatShortAddress } from '@/lib/utils';

type Tab = 'active' | 'inactive';

const PAGE_SIZE = 12;

export default function AdminVenuesPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Venue | null>(null);
  const [confirm, setConfirm] = useState<{ venue: Venue; action: 'soft-delete' | 'restore' | 'hard-delete' } | null>(null);

  const qc = useQueryClient();

  const params: ListAdminVenuesParams = {
    page,
    limit: PAGE_SIZE,
    is_active: tab === 'active',
    ...(search.trim() ? { q: search.trim() } : {}),
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'venues', params],
    queryFn: () => listAdminVenues(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const softDeleteMut = useMutation({
    mutationFn: adminSoftDeleteVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'venues'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Đã vô hiệu hoá venue');
      setConfirm(null);
      setPreview(null);
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const restoreMut = useMutation({
    mutationFn: adminRestoreVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'venues'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Đã khôi phục venue');
      setConfirm(null);
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const hardDeleteMut = useMutation({
    mutationFn: adminHardDeleteVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'venues'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Đã xoá vĩnh viễn venue');
      setConfirm(null);
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const isMutating = softDeleteMut.isPending || restoreMut.isPending || hardDeleteMut.isPending;

  const venues = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function runAction() {
    if (!confirm) return;
    if (confirm.action === 'soft-delete') softDeleteMut.mutate(confirm.venue.id);
    if (confirm.action === 'restore') restoreMut.mutate(confirm.venue.id);
    if (confirm.action === 'hard-delete') hardDeleteMut.mutate(confirm.venue.id);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Quản lý venue</h1>
        <p className="text-slate-500 mt-1">Xem, vô hiệu hoá, khôi phục hoặc xoá vĩnh viễn venue</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {(['active', 'inactive'] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                tab === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {key === 'active' ? 'Đang hoạt động' : 'Đã vô hiệu'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm venue theo tên..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          Không tải được danh sách venue. Kiểm tra API Gateway và quyền admin.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400 py-16 justify-center">
          <Loader2 size={18} className="animate-spin" /> Đang tải...
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
          Không có venue nào trong mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {venues.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="relative h-40 bg-slate-100">
                {v.media?.[0] ? (
                  <img
                    src={v.media[0]}
                    alt={v.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Không có ảnh</div>
                )}
                {v.is_community_contributed && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500 text-white rounded-lg">
                    Cộng đồng
                  </span>
                )}
                {!v.is_active && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-red-500 text-white rounded-lg">
                    Đã vô hiệu
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 text-base mb-1 leading-snug line-clamp-1">{v.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                  <MapPin size={11} /> {formatShortAddress(v) || '—'}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                  {v.description || <span className="italic text-slate-300">Không có mô tả</span>}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {v.rating_avg?.toFixed(1) ?? '0.0'}
                  </span>
                  <span>·</span>
                  <span>{v.review_count} reviews</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {v.total_capacity}</span>
                </div>

                {tab === 'active' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreview(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                    >
                      <Eye size={14} /> Xem
                    </button>
                    <button
                      onClick={() => setConfirm({ venue: v, action: 'soft-delete' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors border border-red-200"
                    >
                      <Trash2 size={14} /> Vô hiệu
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirm({ venue: v, action: 'restore' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors"
                    >
                      <RotateCcw size={14} /> Khôi phục
                    </button>
                    <button
                      onClick={() => setConfirm({ venue: v, action: 'hard-delete' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
                    >
                      <AlertTriangle size={14} /> Xoá vĩnh viễn
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500">
            Trang {page} / {totalPages} · {total} venue
            {isFetching && <Loader2 size={12} className="inline ml-2 animate-spin" />}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {preview.media?.[0] && (
                <img src={preview.media[0]} alt={preview.name} className="w-full h-52 object-cover" referrerPolicy="no-referrer" />
              )}
              <button onClick={() => setPreview(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                <X size={16} />
              </button>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-1">{preview.name}</h2>
                {preview.branch_name && <p className="text-sm text-slate-500 mb-2">Chi nhánh: {preview.branch_name}</p>}
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin size={13} />{formatAddress(preview) || '—'}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {preview.description || <span className="italic text-slate-400">Không có mô tả</span>}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <InfoRow label="Rating" value={`${preview.rating_avg?.toFixed(1) ?? '0.0'} (${preview.review_count} reviews)`} />
                  <InfoRow label="Sức chứa" value={`${preview.total_capacity} người`} />
                  <InfoRow label="Nhóm tối đa" value={`${preview.max_group_size} người`} />
                  <InfoRow label="Mức đông" value={preview.current_crowd_level} />
                  <InfoRow label="Toạ độ" value={`${preview.latitude.toFixed(4)}, ${preview.longitude.toFixed(4)}`} />
                  <InfoRow label="Loại" value={preview.is_community_contributed ? 'Cộng đồng' : 'Owner'} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm action */}
      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !isMutating && setConfirm(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
                confirm.action === 'restore' ? 'bg-green-100 text-green-600'
                  : confirm.action === 'hard-delete' ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600',
              )}>
                {confirm.action === 'restore' ? <RotateCcw size={22} />
                  : confirm.action === 'hard-delete' ? <AlertTriangle size={22} />
                  : <Trash2 size={22} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                {confirm.action === 'restore' ? 'Khôi phục venue?'
                  : confirm.action === 'hard-delete' ? 'Xoá vĩnh viễn?'
                  : 'Vô hiệu hoá venue?'}
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                "{confirm.venue.name}"{' '}
                {confirm.action === 'hard-delete'
                  ? '— hành động này không thể hoàn tác.'
                  : confirm.action === 'restore'
                    ? 'sẽ được hiển thị lại cho người dùng.'
                    : 'sẽ ẩn khỏi danh sách nhưng có thể khôi phục.'}
              </p>
              <div className="flex gap-3">
                <button
                  disabled={isMutating}
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  disabled={isMutating}
                  onClick={runAction}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-1.5',
                    confirm.action === 'restore' ? 'bg-green-500 hover:bg-green-600'
                      : confirm.action === 'hard-delete' ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-amber-500 hover:bg-amber-600',
                    isMutating && 'opacity-70',
                  )}
                >
                  {isMutating && <Loader2 size={14} className="animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700 capitalize">{value}</p>
    </div>
  );
}
