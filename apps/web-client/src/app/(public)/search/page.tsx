'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // replaces react-router-dom
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_VENUES } from '@/data/mockVenues';
import { VenueCard } from '@/components/venue/venue-card';
import { cn } from '@/lib/utils';

// Separated into its own component because useSearchParams() requires a Suspense boundary.
function SearchContent() {
  const searchParams = useSearchParams(); // same API as react-router-dom — no changes needed
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const categories = [
    'Cafe',
    'Study Space',
    'Coworking',
    'Library',
    'Tea House',
    'Garden',
    'Creative Space',
    'Late Night',
  ];

  const filteredVenues = useMemo(() => {
    return MOCK_VENUES.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || venue.categories.includes(selectedCategory);
      const matchesPrice = !priceFilter || venue.priceLevel <= priceFilter;
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [searchQuery, selectedCategory, priceFilter]);

  return (
    <div className="min-h-screen bg-nook-cream/30">
      {/* Search Header */}
      <div className="bg-white border-b border-nook-sand sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex-1 relative">
              <SearchIcon
                className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, vibe, or location..."
                className="nook-input pl-12"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-nook-ink/30 hover:text-nook-ink"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                'nook-button-secondary flex items-center justify-center gap-2',
                isFilterOpen && 'bg-nook-olive text-white'
              )}
            >
              <SlidersHorizontal size={18} />
              <span>Filters</span>
              {(selectedCategory || priceFilter) && (
                <span className="w-5 h-5 bg-white text-nook-olive rounded-full text-[10px] flex items-center justify-center font-bold">
                  {(selectedCategory ? 1 : 0) + (priceFilter ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 border-t border-nook-sand mt-6">
                  {/* Categories */}
                  <div>
                    <h4 className="text-sm font-bold text-nook-ink mb-4 uppercase tracking-wider">
                      Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() =>
                            setSelectedCategory(selectedCategory === cat ? null : cat)
                          }
                          className={cn(
                            'px-4 py-2 rounded-full text-sm font-medium transition-all',
                            selectedCategory === cat
                              ? 'bg-nook-olive text-white shadow-md shadow-nook-olive/20'
                              : 'bg-nook-cream text-nook-ink/60 hover:bg-nook-sand'
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h4 className="text-sm font-bold text-nook-ink mb-4 uppercase tracking-wider">
                      Price Range
                    </h4>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((price) => (
                        <button
                          key={price}
                          onClick={() => setPriceFilter(priceFilter === price ? null : price)}
                          className={cn(
                            'flex-1 py-2 rounded-xl text-sm font-bold transition-all border',
                            priceFilter === price
                              ? 'bg-nook-olive text-white border-nook-olive shadow-md shadow-nook-olive/20'
                              : 'bg-white text-nook-ink/60 border-nook-sand hover:border-nook-olive'
                          )}
                        >
                          {'$'.repeat(price)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear All */}
                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setPriceFilter(null);
                        setSearchQuery('');
                      }}
                      className="text-sm text-nook-olive font-bold hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif font-bold text-nook-ink">
            {filteredVenues.length} {filteredVenues.length === 1 ? 'nook' : 'nooks'} found
          </h2>
          <div className="flex items-center gap-2 text-sm text-nook-ink/40">
            <span>Sort by:</span>
            <select className="bg-transparent font-bold text-nook-ink focus:outline-none">
              <option>Recommended</option>
              <option>Highest Rated</option>
              <option>Most Reviews</option>
              <option>Price: Low to High</option>
            </select>
          </div>
        </div>

        {filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredVenues.map((venue, i) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="w-24 h-24 bg-nook-sand rounded-full flex items-center justify-center mx-auto mb-6 text-nook-ink/20">
              <SearchIcon size={48} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-nook-ink mb-2">No nooks found</h3>
            <p className="text-nook-ink/60 mb-8 max-w-md mx-auto">
              We couldn&apos;t find any locations matching your current search or filters. Try
              adjusting them or clearing all filters.
            </p>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setPriceFilter(null);
                setSearchQuery('');
              }}
              className="nook-button-primary"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap in Suspense — required by Next.js when using useSearchParams() in a Client Component.
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-nook-olive border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
