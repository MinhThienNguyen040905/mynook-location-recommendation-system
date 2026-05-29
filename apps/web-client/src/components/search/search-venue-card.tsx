"use client";

import Link from "next/link";
import { Heart, Star, BadgeCheck, Quote, Tag, Coffee, Navigation } from "lucide-react";
import type { SearchResult } from "@/types/venue";

interface SearchVenueCardProps {
  venue: SearchResult;
}

const CROWD_CONFIG: Record<
  string,
  { label: string; color: string; textColor: string; percent: number }
> = {
  empty: {
    label: "Trống",
    color: "bg-green-500",
    textColor: "text-green-600",
    percent: 15,
  },
  moderate: {
    label: "Vừa phải",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    percent: 50,
  },
  crowded: {
    label: "Đông",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    percent: 80,
  },
  full: {
    label: "Đầy",
    color: "bg-red-500",
    textColor: "text-red-600",
    percent: 100,
  },
};

/** Format tag/category key: "good_coffee" → "Good Coffee" */
function formatTag(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Format metres → "850m" or "1.2km" */
function formatDistance(m: number | null): string | null {
  if (m === null || !Number.isFinite(m)) return null;
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function SearchVenueCard({ venue }: SearchVenueCardProps) {
  const crowd = CROWD_CONFIG[venue.current_crowd_level] ?? CROWD_CONFIG.moderate;
  const imageUrl =
    venue.media?.[0] || `https://picsum.photos/seed/${venue.id}/800/600`;
  const primaryCategory = venue.matched_categories?.[0] ?? null;
  const distance = formatDistance(venue.distance_m);

  return (
    <Link href={`/venues/${venue.id}`}>
      <article className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-nook-olive/50 hover:shadow-md transition-all group cursor-pointer flex flex-col sm:flex-row overflow-hidden h-auto sm:h-56">
        {/* Image Section */}
        <div className="w-full sm:w-64 h-48 sm:h-full relative shrink-0">
          <img
            src={imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
            {primaryCategory && (
              <div className="inline-flex items-center gap-1 bg-[#e9590c] text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                <Coffee size={11} />
                {formatTag(primaryCategory)}
              </div>
            )}
            {venue.is_group_friendly && (
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 shadow-sm">
                Nhóm ≤{venue.max_group_size}
              </div>
            )}
          </div>
          {distance && (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium">
              <Navigation size={11} />
              {distance}
            </div>
          )}
          <button
            onClick={(e) => e.preventDefault()}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/50 hover:bg-white text-slate-700 hover:text-red-500 transition-colors backdrop-blur-sm"
          >
            <Heart size={20} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1 justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-nook-olive transition-colors flex items-center gap-1 truncate">
                {venue.name}
                {venue.branch_name && (
                  <span className="text-sm font-normal text-slate-400">
                    — {venue.branch_name}
                  </span>
                )}
                <BadgeCheck className="text-blue-500 shrink-0" size={18} />
              </h3>
              <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800 shrink-0 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                OPEN
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1 text-yellow-500 font-medium">
                {venue.rating_avg.toFixed(1)}{" "}
                <Star size={14} className="fill-current" />
                <span className="text-slate-400 font-normal">
                  ({venue.review_count})
                </span>
              </span>
              <span>•</span>
              <span className="truncate">{venue.district ?? venue.city}</span>
            </div>

            {/* Matched Tags */}
            {venue.matched_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {venue.matched_tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e9590c]/10 text-[#e9590c] text-xs font-medium"
                  >
                    <Tag size={10} />
                    {formatTag(tag)}
                  </span>
                ))}
                {venue.matched_tags.length > 4 && (
                  <span className="text-xs text-slate-400">
                    +{venue.matched_tags.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Crowding Meter */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Mức độ đông</span>
                <span className={`font-medium ${crowd.textColor}`}>
                  {crowd.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${crowd.color} rounded-full transition-all`}
                  style={{ width: `${crowd.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Description Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500 italic line-clamp-1 flex items-center gap-1">
              <Quote size={14} className="text-nook-olive/40 shrink-0" />
              {venue.description
                ? venue.description.substring(0, 80) + "..."
                : venue.address}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
