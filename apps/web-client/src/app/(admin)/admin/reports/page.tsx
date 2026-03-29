'use client';

import { useState, useMemo } from 'react';
import { Flag, CheckCircle2, Trash2, Search, ChevronDown, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type ReportStatus = 'open' | 'resolved' | 'dismissed';
type ReportType   = 'spam' | 'fake_info' | 'inappropriate' | 'other';

interface Report {
  id: number; reporter: string; target: string; targetType: 'venue' | 'review' | 'user';
  type: ReportType; status: ReportStatus; date: string; detail: string;
}

const MOCK_REPORTS: Report[] = [
  { id: 1,  reporter: 'Minh Tuấn',  target: 'The Quiet Corner',       targetType: 'venue',  type: 'fake_info',     status: 'open',      date: '29/03/2026 10:00', detail: 'Ảnh đăng lên không giống thực tế, không gian thực tế nhỏ hơn nhiều so với mô tả.' },
  { id: 2,  reporter: 'Thu Hương',  target: 'Review của Lê Văn X',    targetType: 'review', type: 'spam',          status: 'open',      date: '29/03/2026 08:30', detail: 'Review này bị đăng lặp lại nhiều lần bởi cùng một người dùng nhằm tăng điểm ảo.' },
  { id: 3,  reporter: 'Phúc Lê',    target: 'Đặng Quốc Gia',          targetType: 'user',   type: 'inappropriate', status: 'open',      date: '28/03/2026 15:45', detail: 'Người dùng này đã đăng bình luận có nội dung không phù hợp trong review.' },
  { id: 4,  reporter: 'Lan Anh',    target: 'Neon Workstation',        targetType: 'venue',  type: 'fake_info',     status: 'resolved',  date: '27/03/2026 12:00', detail: 'Địa chỉ venue không tồn tại, đã kiểm tra thực địa và xác nhận.' },
  { id: 5,  reporter: 'Khải Hoàn', target: 'Review của Trần B',       targetType: 'review', type: 'other',         status: 'resolved',  date: '26/03/2026 09:00', detail: 'Review tiêu cực được đăng bởi đối thủ cạnh tranh, không trải nghiệm thực tế.' },
  { id: 6,  reporter: 'Bảo Châu',   target: 'Zen Reading Room',        targetType: 'venue',  type: 'inappropriate', status: 'dismissed', date: '25/03/2026 14:00', detail: 'Báo cáo không có căn cứ, venue hoạt động bình thường theo phản hồi của owner.' },
  { id: 7,  reporter: 'Đức Lâm',    target: 'Mộc Retro Café',          targetType: 'venue',  type: 'spam',          status: 'dismissed', date: '24/03/2026 11:30', detail: 'Sau khi xem xét không thấy dấu hiệu vi phạm.' },
];

const TYPE_LABEL: Record<ReportType, string> = {
  spam: 'Spam', fake_info: 'Thông tin sai', inappropriate: 'Nội dung xấu', other: 'Khác'
};
const TYPE_COLOR: Record<ReportType, string> = {
  spam: 'bg-orange-100 text-orange-700', fake_info: 'bg-red-100 text-red-600',
  inappropriate: 'bg-purple-100 text-purple-700', other: 'bg-slate-100 text-slate-600'
};
const TARGET_COLOR: Record<string, string> = {
  venue: 'bg-nook-olive/10 text-nook-olive', review: 'bg-blue-100 text-blue-600', user: 'bg-pink-100 text-pink-600'
};
const STATUS_BADGE: Record<ReportStatus, string> = {
  open: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700', dismissed: 'bg-slate-100 text-slate-500'
};
const STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Đang mở', resolved: 'Đã xử lý', dismissed: 'Bỏ qua'
};

export default function AdminReportsPage() {
  const [tab, setTab]           = useState<ReportStatus>('open');
  const [search, setSearch]     = useState('');
  const [reports, setReports]   = useState<Report[]>(MOCK_REPORTS);
  const [detail, setDetail]     = useState<Report | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, resolved: 0, dismissed: 0 };
    reports.forEach((r) => c[r.status]++);
    return c;
  }, [reports]);

  const filtered = useMemo(() =>
    reports.filter((r) => {
      const matchTab    = r.status === tab;
      const matchSearch = !search || r.target.toLowerCase().includes(search.toLowerCase()) || r.reporter.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    }), [reports, tab, search]);

  function updateStatus(id: number, status: ReportStatus) {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setDetail(null);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Báo cáo vi phạm</h1>
        <p className="text-slate-500 mt-1">Xem xét và xử lý các báo cáo từ người dùng</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['open', 'resolved', 'dismissed'] as ReportStatus[]).map((key) => {
          const labels: Record<ReportStatus, string> = { open: 'Đang mở', resolved: 'Đã xử lý', dismissed: 'Bỏ qua' };
          return (
            <button key={key} onClick={() => setTab(key)}
              className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all',
                tab === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {labels[key]}
              <span className={cn('ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full',
                tab === key ? STATUS_BADGE[key] : 'bg-slate-200 text-slate-500'
              )}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo target hoặc người báo cáo..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Không có báo cáo nào.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Đối tượng</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden md:table-cell">Loại vi phạm</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Người báo cáo</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Ngày</th>
                <th className="text-right px-6 py-3.5 font-semibold text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-red-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">{r.target}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', TARGET_COLOR[r.targetType])}>
                          {r.targetType}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', TYPE_COLOR[r.type])}>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-slate-500">{r.reporter}</td>
                  <td className="px-6 py-4 hidden lg:table-cell text-slate-400 text-xs">{r.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setDetail(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <Eye size={15} />
                      </button>
                      {r.status === 'open' && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'resolved')}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Đánh dấu đã xử lý">
                            <CheckCircle2 size={15} />
                          </button>
                          <button onClick={() => updateStatus(r.id, 'dismissed')}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Bỏ qua">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                    <Flag size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Chi tiết báo cáo</h3>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_BADGE[detail.status])}>
                      {STATUS_LABEL[detail.status]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Đối tượng bị báo cáo</p>
                    <p className="text-sm font-semibold text-slate-800">{detail.target}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', TARGET_COLOR[detail.targetType])}>{detail.targetType}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Loại vi phạm</p>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', TYPE_COLOR[detail.type])}>{TYPE_LABEL[detail.type]}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Người báo cáo</p>
                    <p className="text-sm font-semibold text-slate-800">{detail.reporter}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Thời gian</p>
                    <p className="text-xs text-slate-600">{detail.date}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Mô tả chi tiết</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{detail.detail}</p>
                </div>

                {detail.status === 'open' && (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => updateStatus(detail.id, 'resolved')}
                      className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} /> Đã xử lý
                    </button>
                    <button onClick={() => updateStatus(detail.id, 'dismissed')}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <Trash2 size={15} /> Bỏ qua
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
