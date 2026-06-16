'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Eye,
  Heart,
  Info,
  MessageCircle,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { getVenueInteractionAnalytics } from '@/lib/api/interactions';
import type { VenueInteractionAnalytics } from '@/lib/api/interactions';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function VenueAnalytics() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('id');
  const [data, setData] = useState<VenueInteractionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    getVenueInteractionAnalytics(venueId)
      .then((analytics) => {
        if (!cancelled) setData(analytics);
      })
      .catch(() => {
        if (!cancelled) setError('Khong the tai thong ke cua venue nay.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const maxRatingCount = useMemo(() => {
    return Math.max(1, ...(data?.rating_distribution.map((row) => row.count) ?? [0]));
  }, [data]);

  if (!venueId) {
    return (
      <div className="py-16 text-center text-gray-400">
        <Info size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Chon mot venue tu dashboard de xem thong ke</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center text-red-500">
        <AlertTriangle className="mx-auto mb-3 size-8" />
        <p className="font-bold">{error || 'Khong co du lieu thong ke.'}</p>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-primary">Venue analytics</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {data.venue.name}
          {data.venue.branch_name ? (
            <span className="font-medium text-slate-400"> - {data.venue.branch_name}</span>
          ) : null}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Unique viewers"
          value={formatNumber(summary.unique_viewers)}
          hint={`${formatNumber(summary.viewers_last_7d)} viewers in last 7 days`}
        />
        <MetricCard
          icon={Heart}
          label="Favorites"
          value={formatNumber(summary.favorites_count)}
          hint="Users who saved this venue"
        />
        <MetricCard
          icon={Star}
          label="Average rating"
          value={summary.average_rating.toFixed(1)}
          hint={`${formatNumber(summary.reviews_count)} total reviews`}
        />
        <MetricCard
          icon={MessageCircle}
          label="Comments"
          value={formatNumber(summary.review_comments)}
          hint="Comments on venue reviews"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Rating distribution</h2>
          <div className="mt-6 space-y-4">
            {data.rating_distribution.map((row) => (
              <div key={row.rating} className="grid grid-cols-[48px_1fr_48px] items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-bold text-slate-600">
                  {row.rating}
                  <Star className="size-3.5 fill-orange-400 text-orange-400" />
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.count / maxRatingCount) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-bold text-slate-500">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Engagement report</h2>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Users className="size-4 text-primary" /> Verified reviews
              </span>
              <span className="font-bold text-slate-900">{summary.verified_reviews_count}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <ThumbsUp className="size-4 text-primary" /> Review likes
              </span>
              <span className="font-bold text-slate-900">{summary.review_likes}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <ThumbsDown className="size-4 text-primary" /> Review dislikes
              </span>
              <span className="font-bold text-slate-900">{summary.review_dislikes}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle className="size-4" /> Pending reports
              </span>
              <span className="font-bold text-amber-700">
                {summary.pending_reports}/{summary.total_reports}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Recent reviews</h2>
        {data.recent_reviews.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <MessageCircle className="mx-auto mb-3 size-8 opacity-30" />
            <p className="text-sm font-medium">No reviews yet.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {data.recent_reviews.map((review) => (
              <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{review.author_name ?? 'Anonymous user'}</p>
                    <p className="text-xs text-slate-400">{formatDate(review.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600">
                    <Star className="size-3.5 fill-orange-500 text-orange-500" />
                    {review.rating.toFixed(1)}
                  </div>
                </div>
                {review.content && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{review.content}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1"><ThumbsUp className="size-3.5" /> {review.like_count}</span>
                  <span className="flex items-center gap-1"><ThumbsDown className="size-3.5" /> {review.dislike_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-3.5" /> {review.comment_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
