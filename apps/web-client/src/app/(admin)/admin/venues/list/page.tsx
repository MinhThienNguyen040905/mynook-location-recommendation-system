'use client';

import { useState, useMemo } from 'react';
import {
  Search, MapPin, Star, Eye, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, X, Users, Store, TrendingUp, Building2,
  CheckCircle2, XCircle, Coffee, BookOpen, Trees, Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────── */
type ActiveStatus = 'active' | 'inactive';
type CategoryKey  = 'Café' | 'Workspace' | 'Library' | 'Outdoor' | 'Restaurant';

interface AdminVenue {
  id: number;
  name: string;
  branch_name: string | null;
  owner: string;
  owner_email: string;
  category: CategoryKey;
  address: string;
  city: string;
  rating: number;
  review_count: number;
  total_capacity: number;
  is_active: boolean;
  created_at: string;
  image: string;
  description: string;
}

/* ── Mock data ────────────────────────────────────────────────── */
const MOCK_VENUES: AdminVenue[] = [
  {
    id: 1,  name: 'The Loft Saigon',       branch_name: 'Chi nhánh Q.3',
    owner: 'Khải Hoàn',   owner_email: 'khaihoan@gmail.com',
    category: 'Workspace', address: '5 Phạm Ngọc Thạch, Q.3',    city: 'Hồ Chí Minh',
    rating: 4.8, review_count: 142, total_capacity: 60, is_active: true,
    created_at: '15/01/2026',
    image: 'seed/mgv1/400/260',
    description: 'Không gian mở tầng thượng view thành phố, thiết kế công nghiệp. Wifi nhanh, điều hòa mát, cà phê ngon.',
  },
  {
    id: 2,  name: 'Mộc Retro Café',         branch_name: null,
    owner: 'Vân Khánh',   owner_email: 'vankhanh@gmail.com',
    category: 'Café',      address: '67 Lê Lợi, Q.1',             city: 'Hồ Chí Minh',
    rating: 4.6, review_count: 89,  total_capacity: 40, is_active: true,
    created_at: '20/01/2026',
    image: 'seed/mgv2/400/260',
    description: 'Quán cà phê phong cách retro hoài cổ, đồ uống đa dạng, nhạc acoustic nhẹ nhàng.',
  },
  {
    id: 3,  name: 'Hive Library Café',       branch_name: null,
    owner: 'Lan Nguyễn',  owner_email: 'lan.nguyen@gmail.com',
    category: 'Library',   address: '22 Điện Biên Phủ, Q.3',      city: 'Hồ Chí Minh',
    rating: 4.7, review_count: 203, total_capacity: 50, is_active: true,
    created_at: '22/01/2026',
    image: 'seed/mgv3/400/260',
    description: 'Thư viện kết hợp quán cà phê, hơn 2000 đầu sách đa dạng thể loại.',
  },
  {
    id: 4,  name: 'Bình Yên Garden',         branch_name: 'Quán sân vườn',
    owner: 'Phúc Lê',     owner_email: 'phuoc.le@gmail.com',
    category: 'Outdoor',   address: '45 Trần Phú, Q.5',            city: 'Hồ Chí Minh',
    rating: 4.4, review_count: 67,  total_capacity: 80, is_active: true,
    created_at: '28/01/2026',
    image: 'seed/mgv4/400/260',
    description: 'Sân vườn ngoài trời thoáng mát, lý tưởng buổi sáng và chiều mát.',
  },
  {
    id: 5,  name: 'StudyHive Co-working',    branch_name: null,
    owner: 'Thu Hương',   owner_email: 'thu.huong@gmail.com',
    category: 'Workspace', address: '88 Lý Tự Trọng, Q.1',         city: 'Hồ Chí Minh',
    rating: 4.5, review_count: 115, total_capacity: 45, is_active: true,
    created_at: '05/02/2026',
    image: 'seed/mgv5/400/260',
    description: 'Không gian làm việc chung hiện đại với phòng họp riêng và khu vực mở.',
  },
  {
    id: 6,  name: 'Zen Reading Room',        branch_name: null,
    owner: 'Bảo Châu',    owner_email: 'bao.chau@gmail.com',
    category: 'Library',   address: '15 Võ Văn Tần, Q.3',          city: 'Hồ Chí Minh',
    rating: 4.9, review_count: 54,  total_capacity: 30, is_active: false,
    created_at: '10/02/2026',
    image: 'seed/mgv6/400/260',
    description: 'Phòng đọc sách thiền định, không gian tối giản, yên tĩnh tuyệt đối.',
  },
  {
    id: 7,  name: 'The Quiet Corner',        branch_name: null,
    owner: 'Minh Tuấn',   owner_email: 'minh.tuan@gmail.com',
    category: 'Café',      address: '12 Nguyễn Huệ, Q.1',          city: 'Hồ Chí Minh',
    rating: 4.3, review_count: 178, total_capacity: 35, is_active: true,
    created_at: '12/02/2026',
    image: 'seed/mgv7/400/260',
    description: 'Không gian yên tĩnh lý tưởng cho việc học và làm việc, wifi nhanh, cà phê ngon.',
  },
  {
    id: 8,  name: 'Neon Workstation',        branch_name: 'Cơ sở CMT8',
    owner: 'Đức Lâm',     owner_email: 'duc.lam@gmail.com',
    category: 'Workspace', address: '100 Cách Mạng Tháng 8, Q.10', city: 'Hồ Chí Minh',
    rating: 4.1, review_count: 31,  total_capacity: 55, is_active: false,
    created_at: '18/02/2026',
    image: 'seed/mgv8/400/260',
    description: 'Không gian làm việc phong cách cyberpunk độc đáo, ánh đèn neon ấn tượng.',
  },
  {
    id: 9,  name: 'Phin House',              branch_name: null,
    owner: 'Quỳnh Anh',   owner_email: 'quynh.anh@gmail.com',
    category: 'Café',      address: '33 Bùi Viện, Q.1',             city: 'Hồ Chí Minh',
    rating: 4.6, review_count: 92,  total_capacity: 28, is_active: true,
    created_at: '25/02/2026',
    image: 'seed/mgv9/400/260',
    description: 'Chuyên cà phê phin truyền thống Việt Nam, không gian ấm cúng.',
  },
  {
    id: 10, name: 'Green Campus',            branch_name: 'Chi nhánh Thủ Đức',
    owner: 'Hải Đăng',    owner_email: 'hai.dang@gmail.com',
    category: 'Outdoor',   address: '50 Võ Văn Ngân, TP.Thủ Đức',  city: 'Hồ Chí Minh',
    rating: 4.2, review_count: 47,  total_capacity: 100, is_active: true,
    created_at: '01/03/2026',
    image: 'seed/mgv10/400/260',
    description: 'Không gian xanh campus rộng lớn, nhiều cây xanh, phù hợp nhóm lớn.',
  },
  {
    id: 11, name: 'Book & Brew',             branch_name: null,
    owner: 'Thảo Nguyên',  owner_email: 'thao.nguyen@gmail.com',
    category: 'Library',   address: '8 Nguyễn Thị Minh Khai, Q.1', city: 'Hồ Chí Minh',
    rating: 4.7, review_count: 130, total_capacity: 42, is_active: true,
    created_at: '05/03/2026',
    image: 'seed/mgv11/400/260',
    description: 'Kết hợp thư viện và quán café, sộ sách phong phú và đồ uống chất lượng.',
  },
  {
    id: 12, name: 'Summit Co-work',          branch_name: null,
    owner: 'Công Minh',   owner_email: 'cong.minh@gmail.com',
    category: 'Workspace', address: '24 Pasteur, Q.1',              city: 'Hồ Chí Minh',
    rating: 4.4, review_count: 76,  total_capacity: 70, is_active: false,
    created_at: '10/03/2026',
    image: 'seed/mgv12/400/260',
    description: 'Co-working space cao cấp tại trung tâm, view thoáng, trang thiết bị hiện đại.',
  },
];

/* ── Constants ────────────────────────────────────────────────── */
const CATEGORY_ICON: Record<CategoryKey, React.ReactNode> = {
  'Café':       <Coffee   size={12} />,
  'Workspace':  <Briefcase size={12} />,
  'Library':    <BookOpen  size={12} />,
  'Outdoor':    <Trees     size={12} />,
  'Restaurant': <Store     size={12} />,
};

const CATEGORY_COLOR: Record<CategoryKey, string> = {
  'Café':       'bg-amber-50  text-amber-700',
  'Workspace':  'bg-blue-50   text-blue-700',
  'Library':    'bg-purple-50 text-purple-700',
  'Outdoor':    'bg-green-50  text-green-700',
  'Restaurant': 'bg-red-50    text-red-700',
};

/* ── Sub-components ───────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs font-semibold text-nook-olive mt-1.5">{sub}</div>}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function AdminVenueListPage() {
  const [venues, setVenues]       = useState<AdminVenue[]>(MOCK_VENUES);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<CategoryKey | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [detail, setDetail]       = useState<AdminVenue | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminVenue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVenue | null>(null);

  /* ── Derived stats ── */
  const stats = useMemo(() => ({
    total:    venues.length,
    active:   venues.filter(v => v.is_active).length,
    inactive: venues.filter(v => !v.is_active).length,
    avgRating: (venues.reduce((s, v) => s + v.rating, 0) / venues.length).toFixed(1),
  }), [venues]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return venues.filter(v => {
      const matchSearch = !q || v.name.toLowerCase().includes(q)
        || v.owner.toLowerCase().includes(q)
        || v.address.toLowerCase().includes(q);
      const matchCat    = catFilter === 'all'     || v.category === catFilter;
      const matchStatus = statusFilter === 'all'  || (statusFilter === 'active' ? v.is_active : !v.is_active);
      return matchSearch && matchCat && matchStatus;
    });
  }, [venues, search, catFilter, statusFilter]);

  /* ── Actions ── */
  function toggleActive(id: number) {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, is_active: !v.is_active } : v));
    setToggleTarget(null);
    setDetail(null);
  }

  function deleteVenue(id: number) {
    setVenues(prev => prev.filter(v => v.id !== id));
    setDeleteTarget(null);
    setDetail(null);
  }

  /* ── Render ── */
  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Danh sách quán</h1>
        <p className="text-slate-500 mt-1">Quản lý tất cả địa điểm đã được duyệt trong hệ thống</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 size={20} />}   label="Tổng quán"         value={stats.total}    color="bg-slate-100 text-slate-600" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Đang hoạt động"    value={stats.active}   color="bg-green-50 text-green-600"  sub={`${Math.round(stats.active / stats.total * 100)}% tổng số`} />
        <StatCard icon={<XCircle size={20} />}      label="Tạm ngưng"         value={stats.inactive} color="bg-red-50 text-red-500"      />
        <StatCard icon={<TrendingUp size={20} />}   label="Rating trung bình" value={`★ ${stats.avgRating}`} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, owner, địa chỉ..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value as CategoryKey | 'all')}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="Café">Café</option>
            <option value="Workspace">Workspace</option>
            <option value="Library">Library</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Restaurant">Restaurant</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-slate-400">
        Hiển thị <span className="font-semibold text-slate-700">{filtered.length}</span> / {venues.length} quán
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Địa điểm</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden md:table-cell">Danh mục</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Owner</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden xl:table-cell">Rating</th>
                <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Trạng thái</th>
                <th className="text-right px-6 py-3.5 font-semibold text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    Không tìm thấy địa điểm nào.
                  </td>
                </tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  {/* Venue info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://picsum.photos/${v.image}`}
                        alt={v.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{v.name}</p>
                        {v.branch_name && (
                          <p className="text-[11px] text-nook-olive font-medium">{v.branch_name}</p>
                        )}
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="shrink-0" />
                          <span className="truncate">{v.address}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full',
                      CATEGORY_COLOR[v.category]
                    )}>
                      {CATEGORY_ICON[v.category]} {v.category}
                    </span>
                  </td>

                  {/* Owner */}
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="font-medium text-slate-700">{v.owner}</p>
                    <p className="text-xs text-slate-400">{v.owner_email}</p>
                  </td>

                  {/* Rating */}
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <div className="flex items-center gap-1">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-700">{v.rating}</span>
                      <span className="text-xs text-slate-400">({v.review_count})</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full',
                      v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {v.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDetail(v)}
                        title="Xem chi tiết"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => setToggleTarget(v)}
                        title={v.is_active ? 'Tạm ngưng' : 'Kích hoạt'}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          v.is_active
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                        )}
                      >
                        {v.is_active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        title="Xoá quán"
                        className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {detail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-48">
                <img
                  src={`https://picsum.photos/${detail.image}`}
                  alt={detail.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => setDetail(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X size={15} />
                </button>
                <div className="absolute bottom-3 left-4">
                  <h2 className="text-xl font-bold text-white">{detail.name}</h2>
                  {detail.branch_name && (
                    <p className="text-xs text-white/80">{detail.branch_name}</p>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full',
                    CATEGORY_COLOR[detail.category]
                  )}>
                    {CATEGORY_ICON[detail.category]} {detail.category}
                  </span>
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    detail.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {detail.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Owner</p>
                    <p className="font-semibold text-slate-800">{detail.owner}</p>
                    <p className="text-xs text-slate-400">{detail.owner_email}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-800">{detail.rating}</span>
                      <span className="text-xs text-slate-400">({detail.review_count} đánh giá)</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sức chứa</p>
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <Users size={13} className="text-slate-400" /> {detail.total_capacity} người
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ngày tạo</p>
                    <p className="font-semibold text-slate-800">{detail.created_at}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                  <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{detail.address}, {detail.city}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 leading-relaxed">{detail.description}</p>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setToggleTarget(detail); setDetail(null); }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2',
                      detail.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                        : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                    )}
                  >
                    {detail.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {detail.is_active ? 'Tạm ngưng' : 'Kích hoạt'}
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(detail); setDetail(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Xoá quán
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toggle confirm modal ──────────────────────────────── */}
      <AnimatePresence>
        {toggleTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setToggleTarget(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
                toggleTarget.is_active ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
              )}>
                {toggleTarget.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-1">
                {toggleTarget.is_active ? 'Tạm ngưng địa điểm?' : 'Kích hoạt địa điểm?'}
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                {toggleTarget.is_active
                  ? `"${toggleTarget.name}" sẽ bị ẩn khỏi kết quả tìm kiếm.`
                  : `"${toggleTarget.name}" sẽ hiển thị trở lại cho người dùng.`
                }
              </p>
              <div className="flex gap-3">
                <button onClick={() => setToggleTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Huỷ
                </button>
                <button
                  onClick={() => toggleActive(toggleTarget.id)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors',
                    toggleTarget.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  {toggleTarget.is_active ? 'Tạm ngưng' : 'Kích hoạt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ──────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Xoá địa điểm?</h3>
              <p className="text-sm text-slate-500 text-center mb-2">
                Bạn sắp xoá <span className="font-semibold text-slate-700">"{deleteTarget.name}"</span>.
              </p>
              <p className="text-xs text-red-500 text-center mb-6">
                Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Huỷ
                </button>
                <button
                  onClick={() => deleteVenue(deleteTarget.id)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
                >
                  Xoá vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
