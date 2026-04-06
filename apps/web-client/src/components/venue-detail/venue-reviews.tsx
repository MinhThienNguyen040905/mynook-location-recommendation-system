'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquarePlus } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getVenueReviews } from '@/lib/api/reviews';
import { WriteReviewModal } from '@/components/review/write-review-modal';
import type { Review } from '@/types/review';

interface VenueReviewsProps {
  venueId: string;
  venueName: string;
  initialReviews: Review[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.content?.length ?? 0) > 150;

  return (
    <div className="py-5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600 fill-slate-200 dark:fill-slate-600'}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400">{timeAgo(review.created_at)}</span>
      </div>

      {review.content && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {isLong && !expanded ? `${review.content.slice(0, 150)}...` : review.content}
        </p>
      )}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-bold text-[#e9590c] mt-1.5 hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {review.media && review.media.length > 0 && (
        <div className="flex gap-2 mt-3">
          {review.media.map((url, i) => (
            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RatingDistribution({ reviews }: { reviews: Review[] }) {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => dist[r.rating]++);
  const total = reviews.length;

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((s) => {
        const pct = total > 0 ? Math.round((dist[s] / total) * 100) : 0;
        return (
          <div key={s} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-slate-500 font-medium text-right">{s}</span>
            <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-slate-400 text-xs">{dist[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VenueReviews({ venueId, venueName, initialReviews }: VenueReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showWriteModal, setShowWriteModal] = useState(false);

  const refreshReviews = useCallback(async () => {
    try {
      const data = await getVenueReviews(venueId);
      setReviews(data);
    } catch {
      // keep existing reviews on error
    }
  }, [venueId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({reviews.length})</span>
          )}
        </h3>
        <button
          onClick={() => setShowWriteModal(true)}
          className="flex items-center gap-2 bg-[#e9590c] hover:bg-[#c2410b] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
        >
          <MessageSquarePlus size={16} />
          Write a Review
        </button>
      </div>

      {reviews.length > 0 ? (
        <>
          {/* Summary */}
          <div className="flex gap-8 items-start mb-6 p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
            <div className="text-center shrink-0">
              <div className="text-5xl font-bold text-slate-900 dark:text-white leading-none">{avgRating}</div>
              <div className="flex justify-center gap-0.5 my-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600 fill-slate-200 dark:fill-slate-600'}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">{reviews.length} reviews</p>
            </div>
            <RatingDistribution reviews={reviews} />
          </div>

          {/* Review list */}
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm px-5">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
          <p className="text-slate-400 mb-2">No reviews yet</p>
          <p className="text-sm text-slate-400">Be the first to share your experience!</p>
        </div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteModal && (
          <WriteReviewModal
            venueId={venueId}
            venueName={venueName}
            onClose={() => setShowWriteModal(false)}
            onSuccess={refreshReviews}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
