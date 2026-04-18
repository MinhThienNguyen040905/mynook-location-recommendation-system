'use client';

import { useState } from 'react';
import {
  Flag, CheckCircle2, Trash2, Eye, X, Loader2, MessageSquare, Store,
  ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listReviewReports, resolveReviewReport, getReviewReport,
  listVenueReports, resolveVenueReport,
  type ReviewReport, type VenueReport,
} from '@/lib/api/admin';

type Kind = 'review' | 'venue';
type ReviewStatus = 'pending' | 'resolved_deleted' | 'dismissed';
type VenueStatus = 'pending' | 'resolved_deactivated' | 'dismissed';

const PAGE_SIZE = 15;

const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Chờ xử lý',
  resolved_deleted: 'Đã xoá review',
  dismissed: 'Bỏ qua',
};
const VENUE_STATUS_LABEL: Record<VenueStatus, string> = {
  pending: 'Chờ xử lý',
  resolved_deactivated: 'Đã vô hiệu venue',
  dismissed: 'Bỏ qua',
};
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  resolved_deleted: 'bg-green-100 text-green-700',
  resolved_deactivated: 'bg-green-100 text-green-700',
  dismissed: 'bg-slate-100 text-slate-500',
};

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN');
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

export default function AdminReportsPage() {
  const [kind, setKind] = useState<Kind>('review');
  const [statusTab, setStatusTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [page, setPage] = useState(1);
  const [reviewDetail, setReviewDetail] = useState<ReviewReport | null>(null);
  const [venueDetail, setVenueDetail] = useState<VenueReport | null>(null);

  const qc = useQueryClient();

  const reviewStatus: ReviewStatus = statusTab === 'pending' ? 'pending'
    : statusTab === 'resolved' ? 'resolved_deleted' : 'dismissed';
  const venueStatus: VenueStatus = statusTab === 'pending' ? 'pending'
    : statusTab === 'resolved' ? 'resolved_deactivated' : 'dismissed';

  const reviewQ = useQuery({
    queryKey: ['admin', 'review-reports', reviewStatus, page],
    queryFn: () => listReviewReports({ status: reviewStatus, page, limit: PAGE_SIZE }),
    enabled: kind === 'review',
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const venueQ = useQuery({
    queryKey: ['admin', 'venue-reports', venueStatus, page],
    queryFn: () => listVenueReports({ status: venueStatus, page, limit: PAGE_SIZE }),
    enabled: kind === 'venue',
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const reviewResolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'delete' | 'dismiss' }) =>
      resolveReviewReport(id, action),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'review-reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(vars.action === 'delete' ? 'Đã xoá review vi phạm' : 'Đã bỏ qua báo cáo');
      setReviewDetail(null);
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const venueResolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'deactivate' | 'dismiss' }) =>
      resolveVenueReport(id, action),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'venue-reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'venues'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(vars.action === 'deactivate' ? 'Đã vô hiệu venue vi phạm' : 'Đã bỏ qua báo cáo');
      setVenueDetail(null);
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  async function loadReviewDetail(r: ReviewReport) {
    try {
      const full = await getReviewReport(r.id);
      setReviewDetail(full);
    } catch {
      setReviewDetail(r);
    }
  }

  const activeQ = kind === 'review' ? reviewQ : venueQ;
  const total = activeQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Báo cáo vi phạm</h1>
        <p className="text-slate-500 mt-1">Xử lý báo cáo về reviews và venues</p>
      </div>

      {/* Kind tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setKind('review'); setPage(1); }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
            kind === 'review' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <MessageSquare size={14} /> Review reports
        </button>
        <button
          onClick={() => { setKind('venue'); setPage(1); }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
            kind === 'venue' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Store size={14} /> Venue reports
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['pending', 'resolved', 'dismissed'] as const).map((key) => {
          const label = key === 'pending' ? 'Chờ xử lý' : key === 'resolved' ? 'Đã xử lý' : 'Bỏ qua';
          return (
            <button
              key={key}
              onClick={() => { setStatusTab(key); setPage(1); }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                statusTab === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeQ.error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          Không tải được danh sách báo cáo.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeQ.isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" /> Đang tải...
          </div>
        ) : kind === 'review' ? (
          <ReviewTable
            items={reviewQ.data?.data ?? []}
            onView={loadReviewDetail}
            onQuickAction={(id, action) => reviewResolveMut.mutate({ id, action })}
            pending={reviewResolveMut.isPending}
          />
        ) : (
          <VenueTable
            items={venueQ.data?.data ?? []}
            onView={(r) => setVenueDetail(r)}
            onQuickAction={(id, action) => venueResolveMut.mutate({ id, action })}
            pending={venueResolveMut.isPending}
          />
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Trang {page} / {totalPages} · {total} báo cáo
              {activeQ.isFetching && <Loader2 size={12} className="inline ml-2 animate-spin" />}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review report detail */}
      <AnimatePresence>
        {reviewDetail && (
          <DetailModal onClose={() => setReviewDetail(null)}>
            <ModalHeader
              title="Chi tiết báo cáo review"
              status={reviewDetail.status}
              statusLabel={REVIEW_STATUS_LABEL[reviewDetail.status]}
              onClose={() => setReviewDetail(null)}
            />
            <div className="space-y-4 mt-4">
              <InfoGrid>
                <InfoCell label="Review ID" value={shortId(reviewDetail.review_id)} />
                <InfoCell label="Lý do" value={reviewDetail.reason} />
                <InfoCell label="Người báo cáo" value={shortId(reviewDetail.reporter_account_id)} />
                <InfoCell label="Thời gian" value={formatDateTime(reviewDetail.created_at)} />
              </InfoGrid>
              {reviewDetail.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Mô tả từ người báo cáo</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{reviewDetail.description}</p>
                </div>
              )}
              {reviewDetail.review && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1">
                    <MessageSquare size={12} /> Nội dung review gốc
                  </p>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i} size={12}
                        className={cn(
                          i < reviewDetail.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {reviewDetail.review.content || <span className="italic text-slate-400">(không có nội dung)</span>}
                  </p>
                </div>
              )}
              {reviewDetail.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={reviewResolveMut.isPending}
                    onClick={() => reviewResolveMut.mutate({ id: reviewDetail.id, action: 'delete' })}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Trash2 size={15} /> Xoá review vi phạm
                  </button>
                  <button
                    disabled={reviewResolveMut.isPending}
                    onClick={() => reviewResolveMut.mutate({ id: reviewDetail.id, action: 'dismiss' })}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} /> Bỏ qua
                  </button>
                </div>
              )}
            </div>
          </DetailModal>
        )}
      </AnimatePresence>

      {/* Venue report detail */}
      <AnimatePresence>
        {venueDetail && (
          <DetailModal onClose={() => setVenueDetail(null)}>
            <ModalHeader
              title="Chi tiết báo cáo venue"
              status={venueDetail.status}
              statusLabel={VENUE_STATUS_LABEL[venueDetail.status]}
              onClose={() => setVenueDetail(null)}
            />
            <div className="space-y-4 mt-4">
              <InfoGrid>
                <InfoCell label="Venue ID" value={shortId(venueDetail.venue_id)} />
                <InfoCell label="Lý do" value={venueDetail.reason} />
                <InfoCell label="Người báo cáo" value={shortId(venueDetail.reporter_account_id)} />
                <InfoCell label="Thời gian" value={formatDateTime(venueDetail.created_at)} />
              </InfoGrid>
              {venueDetail.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Mô tả từ người báo cáo</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{venueDetail.description}</p>
                </div>
              )}
              {venueDetail.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={venueResolveMut.isPending}
                    onClick={() => venueResolveMut.mutate({ id: venueDetail.id, action: 'deactivate' })}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Trash2 size={15} /> Vô hiệu venue
                  </button>
                  <button
                    disabled={venueResolveMut.isPending}
                    onClick={() => venueResolveMut.mutate({ id: venueDetail.id, action: 'dismiss' })}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} /> Bỏ qua
                  </button>
                </div>
              )}
            </div>
          </DetailModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ReviewTable({
  items, onView, onQuickAction, pending,
}: {
  items: ReviewReport[];
  onView: (r: ReviewReport) => void;
  onQuickAction: (id: string, action: 'delete' | 'dismiss') => void;
  pending: boolean;
}) {
  if (items.length === 0) {
    return <div className="text-center py-16 text-slate-400">Không có báo cáo nào.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Review</th>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden md:table-cell">Lý do</th>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Ngày</th>
          <th className="text-right px-6 py-3.5 font-semibold text-slate-500">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {items.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-red-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-xs">#{shortId(r.review_id)}</p>
                  <p className="text-xs text-slate-400">Reporter: {shortId(r.reporter_account_id)}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 hidden md:table-cell">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">{r.reason}</span>
            </td>
            <td className="px-6 py-4 hidden lg:table-cell text-slate-400 text-xs">{formatDateTime(r.created_at)}</td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onView(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Xem">
                  <Eye size={15} />
                </button>
                {r.status === 'pending' && (
                  <>
                    <button
                      disabled={pending}
                      onClick={() => onQuickAction(r.id, 'delete')}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                      title="Xoá review"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => onQuickAction(r.id, 'dismiss')}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
                      title="Bỏ qua"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VenueTable({
  items, onView, onQuickAction, pending,
}: {
  items: VenueReport[];
  onView: (r: VenueReport) => void;
  onQuickAction: (id: string, action: 'deactivate' | 'dismiss') => void;
  pending: boolean;
}) {
  if (items.length === 0) {
    return <div className="text-center py-16 text-slate-400">Không có báo cáo nào.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Venue</th>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden md:table-cell">Lý do</th>
          <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Ngày</th>
          <th className="text-right px-6 py-3.5 font-semibold text-slate-500">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {items.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Store size={14} className="text-nook-olive shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-xs">#{shortId(r.venue_id)}</p>
                  <p className="text-xs text-slate-400">Reporter: {shortId(r.reporter_account_id)}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 hidden md:table-cell">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">{r.reason}</span>
            </td>
            <td className="px-6 py-4 hidden lg:table-cell text-slate-400 text-xs">{formatDateTime(r.created_at)}</td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onView(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Xem">
                  <Eye size={15} />
                </button>
                {r.status === 'pending' && (
                  <>
                    <button
                      disabled={pending}
                      onClick={() => onQuickAction(r.id, 'deactivate')}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                      title="Vô hiệu venue"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => onQuickAction(r.id, 'dismiss')}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
                      title="Bỏ qua"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  );
}

function ModalHeader({
  title, status, statusLabel, onClose,
}: { title: string; status: string; statusLabel: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
          <Flag size={16} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_BADGE[status])}>
            {statusLabel}
          </span>
        </div>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
        <X size={16} />
      </button>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
}
