import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import type { Venue } from "@/types/venue";

const CROWD_CONFIG: Record<string, { label: string; percent: number; color: string }> = {
  empty: { label: "Empty - Plenty of space", percent: 10, color: "bg-emerald-500" },
  moderate: { label: "Moderate - Good for groups", percent: 40, color: "bg-yellow-500" },
  crowded: { label: "Crowded - Limited seats", percent: 75, color: "bg-orange-500" },
  full: { label: "Full - No seats available", percent: 100, color: "bg-red-500" },
};

export function VenueHeader({ venue }: { venue: Venue }) {
  const crowd = CROWD_CONFIG[venue.current_crowd_level] ?? CROWD_CONFIG.moderate;
  const fullAddress = formatAddress(venue);

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      <nav className="flex mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-[#e9590c] transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-[#e9590c] transition-colors">
          Venues
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 dark:text-white font-medium">
          {venue.name}
        </span>
      </nav>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {venue.name}
            </h1>
            <FavoriteButton venueId={venue.id} className="shrink-0 mt-1" />
          </div>
          {venue.branch_name && (
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">
              {venue.branch_name}
            </p>
          )}
          <div className="flex items-center text-slate-600 dark:text-slate-300 gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin className="text-[#e9590c]" size={16} />
              <span>{fullAddress}</span>
            </div>
            {venue.rating_avg > 0 && (
              <div className="flex items-center gap-1.5 text-[#e9590c]">
                <Star size={16} className="fill-current" />
                <span className="font-bold">{venue.rating_avg.toFixed(1)}</span>
                {venue.review_count > 0 && (
                  <span className="text-slate-500">({venue.review_count} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Crowd Meter */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm w-full md:w-auto min-w-[280px]">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e9590c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e9590c]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Live Crowd
              </span>
            </div>
            <span className="text-[#e9590c] font-bold capitalize">{venue.current_crowd_level}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
            <div
              className={`${crowd.color} h-2.5 rounded-full transition-all`}
              style={{ width: `${crowd.percent}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {crowd.label}
          </p>
        </div>
      </div>
    </div>
  );
}
