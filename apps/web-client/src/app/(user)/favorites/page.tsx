'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Heart, Search, Trash2, MapPin, Star, SlidersHorizontal, X, Loader2, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listFavorites, removeFavorite, type FavoriteVenue,
} from '@/lib/api/favorites';
import { cn } from '@/lib/utils';

/* ── Favorite Venue Card ─────────────────────────────────────── */
function FavoriteCard({
  venue,
  onRemove,
  isRemoving,
}: {
  venue: FavoriteVenue;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addressParts = [
    venue.address_line,
    venue.ward,
    venue.district_name,
    venue.city_name,
  ].filter(Boolean);
  const address = addressParts.join(', ') || '—';

  const cover = venue.media[0];
  const categories = venue.categories.slice(0, 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-nook-sand shadow-sm overflow-hidden group hover:shadow-md hover:border-nook-olive/30 transition-all"
    >
      <Link href={`/venues/${venue.venue_id}`} className="block relative aspect-[4/3] overflow-hidden bg-nook-sand">
        {cover ? (
          <img
            src={cover}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-nook-ink/30 text-xs">
            Không có ảnh
          </div>
        )}

        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-nook-olive">
          <Star size={11} fill="currentColor" />
          {venue.rating_avg.toFixed(1)}
        </div>

        {categories.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className={cn(
                    'px-2 py-0.5 backdrop-blur-md text-[10px] uppercase tracking-wider font-bold rounded-full border',
                    c.is_primary
                      ? 'bg-nook-olive/80 text-white border-nook-olive'
                      : 'bg-white/20 text-white border-white/30',
                  )}
                >
                  {c.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </Link>

      <div className="p-4">
        <Link href={`/venues/${venue.venue_id}`}>
          <h3 className="font-bold text-nook-ink text-base mb-1 group-hover:text-nook-olive transition-colors line-clamp-1">
            {venue.name}
            {venue.branch_name && (
              <span className="text-xs font-normal text-nook-ink/50 ml-1">
                · {venue.branch_name}
              </span>
            )}
          </h3>
        </Link>
        <div className="flex items-center gap-1 text-nook-ink/50 text-xs mb-3">
          <MapPin size={12} className="text-nook-olive shrink-0" />
          <span className="truncate">{address}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-nook-sand text-xs text-nook-ink/50">
          <span className="flex items-center gap-1">
            <Users size={12} className="text-nook-olive" />
            {venue.total_capacity || '—'}
          </span>
          <span>{venue.review_count} đánh giá</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              disabled={isRemoving}
              onClick={() => onRemove(venue.venue_id)}
              className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isRemoving && <Loader2 size={12} className="animate-spin" />}
              Xác nhận xóa
            </button>
            <button
              disabled={isRemoving}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 bg-nook-sand text-nook-ink/60 text-xs font-medium rounded-xl hover:bg-nook-sand/80 transition-colors disabled:opacity-60"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-nook-ink/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
          >
            <Trash2 size={13} />
            Bỏ yêu thích
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-20 text-center"
    >
      <div className="w-20 h-20 bg-nook-olive/10 rounded-full flex items-center justify-center mx-auto mb-5">
        <Heart size={36} className="text-nook-olive/40" />
      </div>
      <h3 className="text-xl font-bold text-nook-ink mb-2">
        {hasFilter ? 'Không tìm thấy venue' : 'Chưa có venue yêu thích'}
      </h3>
      <p className="text-nook-ink/50 text-sm max-w-sm mx-auto mb-6">
        {hasFilter
          ? 'Thử thay đổi bộ lọc hoặc xóa tìm kiếm.'
          : 'Khám phá các venue và nhấn ♥ để lưu vào danh sách yêu thích của bạn.'}
      </p>
      {!hasFilter && (
        <Link href="/search" className="nook-button-primary inline-flex items-center gap-2 py-3 px-6">
          <Search size={16} /> Khám phá venues
        </Link>
      )}
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function FavoritesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
    refetchOnWindowFocus: false,
  });

  const removeMut = useMutation({
    mutationFn: removeFavorite,
    onMutate: (id) => setRemovingId(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['favorite-ids'] });
      toast.success('Đã bỏ khỏi yêu thích');
    },
    onError: () => toast.error('Bỏ yêu thích thất bại'),
    onSettled: () => setRemovingId(null),
  });

  const categories = useMemo(() => {
    const all = favorites.flatMap((v) => v.categories.map((c) => c.display_name));
    return ['Tất cả', ...Array.from(new Set(all))];
  }, [favorites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return favorites.filter((v) => {
      const haystack = [
        v.name,
        v.branch_name,
        v.address_line,
        v.ward,
        v.district_name,
        v.city_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchCategory =
        activeCategory === 'Tất cả' ||
        v.categories.some((c) => c.display_name === activeCategory);
      return matchSearch && matchCategory;
    });
  }, [favorites, search, activeCategory]);

  const hasFilter = search !== '' || activeCategory !== 'Tất cả';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-nook-ink flex items-center gap-3">
            <Heart size={28} className="text-nook-olive fill-current" />
            Yêu thích
          </h1>
          <p className="text-nook-ink/50 text-sm mt-1">
            {favorites.length} venue đã lưu
          </p>
        </div>
        <Link href="/search" className="nook-button-secondary flex items-center gap-2 py-2.5">
          <Search size={16} /> Khám phá thêm
        </Link>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm mb-6">
          Không tải được danh sách yêu thích. Bạn cần đăng nhập để xem trang này.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-nook-ink/40 py-16 justify-center">
          <Loader2 size={18} className="animate-spin" /> Đang tải...
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <>
              {/* ── Search + Filter bar ── */}
              <div className="bg-white rounded-2xl border border-nook-sand shadow-sm p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nook-ink/30" />
                    <input
                      type="text"
                      placeholder="Tìm trong danh sách yêu thích..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="nook-input !pl-10 py-2.5 text-sm"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-nook-ink/30 hover:text-nook-ink">
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <SlidersHorizontal size={15} className="text-nook-ink/30 shrink-0" />
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          'shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                          activeCategory === cat
                            ? 'bg-nook-olive text-white shadow-sm'
                            : 'bg-nook-cream text-nook-ink/60 hover:bg-nook-sand',
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {hasFilter && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-nook-ink/50">
                    {filtered.length} / {favorites.length} venue
                  </p>
                  <button
                    onClick={() => { setSearch(''); setActiveCategory('Tất cả'); }}
                    className="text-xs text-nook-olive font-bold hover:underline"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </>
          )}

          {filtered.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence>
                {filtered.map((venue) => (
                  <FavoriteCard
                    key={venue.venue_id}
                    venue={venue}
                    isRemoving={removingId === venue.venue_id}
                    onRemove={(id) => removeMut.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyState hasFilter={hasFilter} />
          )}
        </>
      )}
    </div>
  );
}
