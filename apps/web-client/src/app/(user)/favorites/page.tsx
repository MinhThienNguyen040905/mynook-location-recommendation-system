'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Search, Trash2, MapPin, Star, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_VENUES, type MockVenue } from '@/data/mockVenues';
import { cn } from '@/lib/utils';

/* ── Mock: v1, v3, v4, v6, v7 đã được lưu yêu thích ─────────── */
const INITIAL_FAVORITES = new Set(['v1', 'v3', 'v4', 'v6', 'v7']);

/* ── Favorite Venue Card ─────────────────────────────────────── */
function FavoriteCard({
  venue,
  onRemove,
}: {
  venue: MockVenue;
  onRemove: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-nook-sand shadow-sm overflow-hidden group hover:shadow-md hover:border-nook-olive/30 transition-all"
    >
      {/* Image */}
      <Link href={`/venues/${venue.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={venue.images[0]}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Rating badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-nook-olive">
          <Star size={11} fill="currentColor" />
          {venue.rating}
        </div>
        {/* Category badges */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex flex-wrap gap-1.5">
            {venue.categories.map(cat => (
              <span key={cat} className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white text-[10px] uppercase tracking-wider font-bold rounded-full border border-white/30">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <Link href={`/venues/${venue.id}`}>
          <h3 className="font-bold text-nook-ink text-base mb-1 group-hover:text-nook-olive transition-colors line-clamp-1">
            {venue.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1 text-nook-ink/50 text-xs mb-3">
          <MapPin size={12} className="text-nook-olive shrink-0" />
          <span className="truncate">{venue.address}</span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {venue.features.slice(0, 2).map(f => (
            <span key={f} className="text-[10px] font-medium px-2 py-0.5 bg-nook-olive/8 text-nook-olive rounded-md">
              {f}
            </span>
          ))}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-nook-sand">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className={cn('text-sm font-bold', i < venue.priceLevel ? 'text-nook-olive' : 'text-nook-sand')}>$</span>
            ))}
          </div>
          <span className="text-xs text-nook-ink/40">{venue.reviewCount} reviews</span>
        </div>
      </div>

      {/* Remove button */}
      <div className="px-4 pb-4">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => onRemove(venue.id)}
              className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors"
            >
              Xác nhận xóa
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 bg-nook-sand text-nook-ink/60 text-xs font-medium rounded-xl hover:bg-nook-sand/80 transition-colors"
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

/* ── All categories from favorites ──────────────────────────── */
function getCategories(venues: MockVenue[]) {
  const all = venues.flatMap(v => v.categories);
  return ['Tất cả', ...Array.from(new Set(all))];
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function FavoritesPage() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(INITIAL_FAVORITES);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const favoriteVenues = MOCK_VENUES.filter(v => favoriteIds.has(v.id));
  const categories     = getCategories(favoriteVenues);

  const filtered = favoriteVenues.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase())
      || v.address.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'Tất cả' || v.categories.includes(activeCategory);
    return matchSearch && matchCategory;
  });

  function handleRemove(id: string) {
    setFavoriteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

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
            {favoriteVenues.length} venue đã lưu
          </p>
        </div>
        <Link href="/search" className="nook-button-secondary flex items-center gap-2 py-2.5">
          <Search size={16} /> Khám phá thêm
        </Link>
      </div>

      {favoriteVenues.length > 0 && (
        <>
          {/* ── Search + Filter bar ── */}
          <div className="bg-white rounded-2xl border border-nook-sand shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nook-ink/30" />
                <input
                  type="text"
                  placeholder="Tìm trong danh sách yêu thích..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="nook-input !pl-10 py-2.5 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-nook-ink/30 hover:text-nook-ink">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Category chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <SlidersHorizontal size={15} className="text-nook-ink/30 shrink-0" />
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                      activeCategory === cat
                        ? 'bg-nook-olive text-white shadow-sm'
                        : 'bg-nook-cream text-nook-ink/60 hover:bg-nook-sand'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Result count ── */}
          {hasFilter && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-nook-ink/50">
                {filtered.length} / {favoriteVenues.length} venue
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

      {/* ── Grid ── */}
      {filtered.length > 0 ? (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filtered.map(venue => (
              <FavoriteCard key={venue.id} venue={venue} onRemove={handleRemove} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState hasFilter={hasFilter} />
      )}
    </div>
  );
}
