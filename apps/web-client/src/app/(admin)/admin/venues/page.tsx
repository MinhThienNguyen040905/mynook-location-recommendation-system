'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, MapPin, User, Search, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type VenueStatus = 'pending' | 'approved' | 'rejected';

interface Venue {
  id: number; name: string; owner: string; category: string;
  address: string; submittedAt: string; status: VenueStatus;
  description: string; image: string; note?: string;
}

const MOCK_VENUES: Venue[] = [
  { id:  1, name: 'The Quiet Corner',     owner: 'Minh Tuấn',   category: 'Café',      address: '12 Nguyễn Huệ, Q.1',         submittedAt: '29/03/2026 09:12', status: 'pending',  description: 'Không gian yên tĩnh lý tưởng cho việc học và làm việc, wifi nhanh, cà phê ngon.', image: 'seed/venue1/400/250' },
  { id:  2, name: 'StudyHive Co-working', owner: 'Thu Hương',   category: 'Workspace', address: '88 Lý Tự Trọng, Q.1',        submittedAt: '29/03/2026 06:30', status: 'pending',  description: 'Không gian làm việc chung hiện đại với phòng họp riêng và khu vực mở.', image: 'seed/venue2/400/250' },
  { id:  3, name: 'Bình Yên Garden',      owner: 'Phúc Lê',     category: 'Outdoor',   address: '45 Trần Phú, Q.5',           submittedAt: '28/03/2026 14:00', status: 'pending',  description: 'Sân vườn ngoài trời thoáng mát, lý tưởng buổi sáng và chiều mát.', image: 'seed/venue3/400/250' },
  { id:  4, name: 'Hive Library Café',    owner: 'Lan Nguyễn',  category: 'Library',   address: '22 Điện Biên Phủ, Q.3',      submittedAt: '28/03/2026 10:20', status: 'pending',  description: 'Thư viện kết hợp quán cà phê, hơn 2000 đầu sách.', image: 'seed/venue4/400/250', note: 'Cần bổ sung giấy phép kinh doanh' },
  { id:  5, name: 'The Loft Saigon',      owner: 'Khải Hoàn',   category: 'Workspace', address: '5 Phạm Ngọc Thạch, Q.3',    submittedAt: '27/03/2026 16:45', status: 'approved', description: 'Không gian mở tầng thượng view thành phố, thiết kế công nghiệp.', image: 'seed/venue5/400/250' },
  { id:  6, name: 'Mộc Retro Café',       owner: 'Vân Khánh',   category: 'Café',      address: '67 Lê Lợi, Q.1',            submittedAt: '26/03/2026 11:00', status: 'approved', description: 'Quán cà phê phong cách retro hoài cổ, đồ uống đa dạng.', image: 'seed/venue6/400/250' },
  { id:  7, name: 'Neon Workstation',     owner: 'Đức Lâm',     category: 'Workspace', address: '100 Cách Mạng Tháng 8, Q.10', submittedAt: '25/03/2026 09:00', status: 'rejected', description: 'Không gian làm việc phong cách cyberpunk độc đáo.', image: 'seed/venue7/400/250', note: 'Ảnh chụp không đúng thực tế, yêu cầu chụp lại' },
  { id:  8, name: 'Zen Reading Room',     owner: 'Bảo Châu',    category: 'Library',   address: '15 Võ Văn Tần, Q.3',         submittedAt: '24/03/2026 14:30', status: 'rejected', description: 'Phòng đọc sách thiền định, không gian tối giản.', image: 'seed/venue8/400/250', note: 'Địa chỉ không xác minh được' },
];

const TAB_CONFIG: { key: VenueStatus | 'all'; label: string; color: string }[] = [
  { key: 'pending',  label: 'Chờ duyệt',  color: 'text-amber-600 border-amber-500' },
  { key: 'approved', label: 'Đã duyệt',   color: 'text-green-600 border-green-500' },
  { key: 'rejected', label: 'Từ chối',    color: 'text-red-500 border-red-500'     },
];

export default function AdminVenuesPage() {
  const [tab, setTab]         = useState<VenueStatus>('pending');
  const [search, setSearch]   = useState('');
  const [venues, setVenues]   = useState<Venue[]>(MOCK_VENUES);
  const [preview, setPreview] = useState<Venue | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Venue | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    venues.forEach((v) => c[v.status]++);
    return c;
  }, [venues]);

  const filtered = useMemo(() =>
    venues.filter((v) => {
      const matchTab    = v.status === tab;
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.owner.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    }), [venues, tab, search]);

  function approve(id: number) {
    setVenues((prev) => prev.map((v) => v.id === id ? { ...v, status: 'approved' } : v));
    setPreview(null);
  }

  function reject(id: number, note: string) {
    setVenues((prev) => prev.map((v) => v.id === id ? { ...v, status: 'rejected', note } : v));
    setRejectTarget(null);
    setRejectNote('');
    setPreview(null);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Duyệt venue</h1>
        <p className="text-slate-500 mt-1">Xem xét và phê duyệt các venue mới gửi lên</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as VenueStatus)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all',
              tab === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
            <span className={cn(
              'ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full',
              tab === key ? (key === 'pending' ? 'bg-amber-100 text-amber-700' : key === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600') : 'bg-slate-200 text-slate-500'
            )}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm venue hoặc owner..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
          Không có venue nào trong mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              {/* Image */}
              <div className="relative h-40 bg-slate-100">
                <img
                  src={`https://picsum.photos/${v.image}`}
                  alt={v.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-slate-700">
                  {v.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 text-base mb-1 leading-snug">{v.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <User size={11} /> {v.owner}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                  <MapPin size={11} /> {v.address}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{v.description}</p>

                {v.note && (
                  <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                    Ghi chú: {v.note}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 mb-4">Gửi lúc: {v.submittedAt}</div>

                {/* Actions */}
                {tab === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(v.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors"
                    >
                      <CheckCircle2 size={14} /> Duyệt
                    </button>
                    <button
                      onClick={() => setRejectTarget(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors border border-red-200"
                    >
                      <XCircle size={14} /> Từ chối
                    </button>
                    <button
                      onClick={() => setPreview(v)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setPreview(v)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                    <Eye size={14} /> Xem chi tiết
                  </button>
                )}
              </div>
            </div>
          ))}
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
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <img src={`https://picsum.photos/${preview.image}`} alt={preview.name} className="w-full h-52 object-cover" referrerPolicy="no-referrer" />
              <button onClick={() => setPreview(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                <X size={16} />
              </button>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{preview.name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><User size={13} />{preview.owner}</span>
                      <span className="flex items-center gap-1"><MapPin size={13} />{preview.address}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{preview.category}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{preview.description}</p>
                {preview.note && (
                  <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <span className="font-bold">Ghi chú admin: </span>{preview.note}
                  </div>
                )}
                {preview.status === 'pending' && (
                  <div className="flex gap-3">
                    <button onClick={() => approve(preview.id)} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Duyệt venue
                    </button>
                    <button onClick={() => { setRejectTarget(preview); setPreview(null); }} className="flex-1 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 font-bold transition-colors flex items-center justify-center gap-2">
                      <XCircle size={16} /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject note modal */}
      <AnimatePresence>
        {rejectTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRejectTarget(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <XCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Từ chối venue?</h3>
              <p className="text-sm text-slate-500 text-center mb-4">"{rejectTarget.name}"</p>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Lý do từ chối (sẽ gửi cho owner)..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-red-300 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Huỷ</button>
                <button
                  onClick={() => reject(rejectTarget.id, rejectNote)}
                  disabled={!rejectNote.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
