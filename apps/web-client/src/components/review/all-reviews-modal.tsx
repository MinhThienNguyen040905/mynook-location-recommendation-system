'use client';

import { useState, useMemo } from 'react';
import { X, Star, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK_REVIEWS = [
  { id: 1,  name: 'Minh Tuấn',     avatar: 'seed/user1/80/80',   rating: 5, date: '2 ngày trước',    text: 'Quán cực kỳ yên tĩnh và thoải mái. Wi-Fi nhanh, cà phê ngon. Mình hay đến đây làm việc mỗi sáng, không gian rất phù hợp để tập trung.' },
  { id: 2,  name: 'Thu Hương',     avatar: 'seed/user2/80/80',   rating: 4, date: '5 ngày trước',    text: 'Không gian đẹp, nhân viên thân thiện. Chỉ hơi tiếc là buổi chiều đông nên đôi khi không có chỗ ngồi. Nên đến trước 2 giờ chiều.' },
  { id: 3,  name: 'Phúc Nguyễn',   avatar: 'seed/user3/80/80',   rating: 5, date: '1 tuần trước',    text: 'Địa điểm lý tưởng để đọc sách hoặc làm việc một mình. Ánh sáng tự nhiên rất tốt, âm nhạc nhẹ nhàng không gây phân tâm.' },
  { id: 4,  name: 'Lan Anh',       avatar: 'seed/user4/80/80',   rating: 3, date: '1 tuần trước',    text: 'Quán ổn nhưng giá hơi cao so với mặt bằng chung. Cà phê ngon nhưng ổ cắm điện không đủ, phải ngồi gần tường mới có.' },
  { id: 5,  name: 'Khải Hoàn',     avatar: 'seed/user5/80/80',   rating: 5, date: '2 tuần trước',    text: 'Tuyệt vời! Mình đã đến hơn 10 lần rồi. Chủ quán rất thân thiện và hay có chương trình khuyến mãi cho khách quen.' },
  { id: 6,  name: 'Bảo Châu',      avatar: 'seed/user6/80/80',   rating: 4, date: '2 tuần trước',    text: 'Không gian vintage rất đẹp, chụp ảnh cực hút. Đồ uống đa dạng và tasty. Sẽ quay lại lần sau với nhóm bạn.' },
  { id: 7,  name: 'Đức Lâm',       avatar: 'seed/user7/80/80',   rating: 2, date: '3 tuần trước',    text: 'Phục vụ chậm dù không đông khách. Gọi đồ mất 20 phút mới lên. Không gian đẹp nhưng dịch vụ cần cải thiện nhiều hơn.' },
  { id: 8,  name: 'Ngọc Linh',     avatar: 'seed/user8/80/80',   rating: 5, date: '1 tháng trước',   text: 'Đây là quán yêu thích của mình! Đến đây là quên hết mệt mỏi. Cà phê trứng ở đây ngon nhất Hà Nội mình từng thử.' },
  { id: 9,  name: 'Trọng Khiêm',   avatar: 'seed/user9/80/80',   rating: 4, date: '1 tháng trước',   text: 'Mình hay dùng quán này để học bài thi. Yên tĩnh vừa đủ, không quá ồn. Bãi gửi xe rộng rãi tiện lợi.' },
  { id: 10, name: 'Hà Phương',     avatar: 'seed/user10/80/80',  rating: 3, date: '1 tháng trước',   text: 'Trải nghiệm bình thường, không có gì nổi bật. Đồ uống ok nhưng không đặc biệt. Giá cả hợp lý.' },
  { id: 11, name: 'Vân Khánh',     avatar: 'seed/user11/80/80',  rating: 5, date: '2 tháng trước',   text: 'Phát hiện ra quán này hơi muộn nhưng giờ thì không thể ngày nào không ghé. Staff rất vui tính và nhớ order của khách quen.' },
  { id: 12, name: 'Tiến Dũng',     avatar: 'seed/user12/80/80',  rating: 4, date: '2 tháng trước',   text: 'Góc ngồi view đẹp, ổ điện nhiều, wifi ổn định. Chỉ tiếc toilet hơi chật. Overall rất recommend cho dân work from café.' },
];

type SortOption = 'newest' | 'highest' | 'lowest';

interface AllReviewsModalProps {
  venueName: string;
  rating: number;
  reviewCount: number;
  onClose: () => void;
  onWriteReview: () => void;
}

/* ── Rating distribution ─────────────────────────────────────── */
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-nook-ink/50 font-medium text-right">{star}</span>
      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-1.5 bg-nook-sand rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: (5 - star) * 0.08 }}
          className="h-full bg-amber-400 rounded-full"
        />
      </div>
      <span className="w-6 text-nook-ink/40 text-xs">{count}</span>
    </div>
  );
}

/* ── Single review card ──────────────────────────────────────── */
function ReviewCard({ review }: { review: (typeof MOCK_REVIEWS)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 120;

  return (
    <div className="py-5 border-b border-nook-sand last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <img
          src={`https://picsum.photos/${review.avatar}`}
          alt={review.name}
          className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-nook-sand"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-nook-ink text-sm truncate">{review.name}</span>
            <span className="text-xs text-nook-ink/40 shrink-0">{review.date}</span>
          </div>
          <div className="flex gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={12}
                className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-nook-sand fill-nook-sand'}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-nook-ink/70 leading-relaxed">
        {isLong && !expanded ? `${review.text.slice(0, 120)}...` : review.text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-bold text-nook-olive mt-1.5 hover:underline"
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────────── */
export function AllReviewsModal({
  venueName,
  rating,
  reviewCount,
  onClose,
  onWriteReview,
}: AllReviewsModalProps) {
  const [sort, setSort] = useState<SortOption>('newest');
  const [search, setSearch] = useState('');
  const [filterStar, setFilterStar] = useState(0);

  /* Distribution */
  const dist = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    MOCK_REVIEWS.forEach((r) => map[r.rating]++);
    return map;
  }, []);

  const filtered = useMemo(() => {
    let list = [...MOCK_REVIEWS];
    if (filterStar > 0) list = list.filter((r) => r.rating === filterStar);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.text.toLowerCase().includes(q)
      );
    }
    if (sort === 'highest') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'lowest')  list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [sort, search, filterStar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-nook-sand rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nook-sand shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold text-nook-ink">Tất cả bình luận</h2>
            <p className="text-sm text-nook-ink/50 mt-0.5 truncate max-w-[240px]">{venueName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onWriteReview(); }}
              className="nook-button-primary text-sm px-4 py-2 hidden sm:flex items-center gap-1.5"
            >
              Viết bình luận
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-nook-sand transition-colors text-nook-ink/50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-5 border-b border-nook-sand shrink-0">
          <div className="flex gap-8 items-start">
            {/* Big score */}
            <div className="text-center shrink-0">
              <div className="text-6xl font-serif font-bold text-nook-ink leading-none">{rating}</div>
              <div className="flex justify-center gap-0.5 my-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-nook-sand fill-nook-sand'}
                  />
                ))}
              </div>
              <p className="text-xs text-nook-ink/40">{reviewCount} đánh giá</p>
            </div>

            {/* Bar chart */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar key={s} star={s} count={dist[s]} total={MOCK_REVIEWS.length} />
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-nook-sand shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nook-ink/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm trong bình luận..."
              className="nook-input pl-9 text-sm py-2.5"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Star filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {[0, 5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStar(s)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors',
                    filterStar === s
                      ? 'bg-nook-olive text-white border-nook-olive'
                      : 'bg-white text-nook-ink/60 border-nook-sand hover:border-nook-olive'
                  )}
                >
                  {s === 0 ? 'Tất cả' : (
                    <>
                      {s} <Star size={10} className="fill-current" />
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative ml-auto">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="appearance-none text-xs font-bold text-nook-ink/60 border border-nook-sand rounded-full px-3 py-1.5 pr-7 bg-white cursor-pointer focus:outline-none focus:border-nook-olive"
              >
                <option value="newest">Mới nhất</option>
                <option value="highest">Điểm cao nhất</option>
                <option value="lowest">Điểm thấp nhất</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nook-ink/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Review list */}
        <div className="overflow-y-auto flex-1 px-6">
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center"
              >
                <p className="text-nook-ink/40 text-sm">Không tìm thấy bình luận phù hợp.</p>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filtered.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile write button */}
        <div className="px-6 py-4 border-t border-nook-sand sm:hidden shrink-0">
          <button
            onClick={() => { onClose(); onWriteReview(); }}
            className="nook-button-primary w-full py-3 font-bold"
          >
            Viết bình luận
          </button>
        </div>
      </motion.div>
    </div>
  );
}
