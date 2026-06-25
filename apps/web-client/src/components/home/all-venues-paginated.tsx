"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { formatShortAddress } from "@/lib/utils";
import type { Venue } from "@/types/venue";

const PAGE_SIZE = 8;

const CROWD_LABEL: Record<string, { text: string; color: string }> = {
  empty: { text: "Vắng", color: "bg-emerald-500" },
  moderate: { text: "Vừa phải", color: "bg-yellow-500" },
  crowded: { text: "Đông", color: "bg-orange-500" },
  full: { text: "Hết chỗ", color: "bg-red-500" },
};

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
];

function getVenueImage(venue: Venue, index: number): string {
  if (venue.media && venue.media.length > 0) return venue.media[0];
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

export function AllVenuesPaginated({ venues }: { venues: Venue[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(venues.length / PAGE_SIZE);

  const visibleVenues = useMemo(
    () => venues.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [page, venues],
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleVenues.map((venue, index) => {
          const originalIndex = page * PAGE_SIZE + index;
          const crowd = CROWD_LABEL[venue.current_crowd_level] ?? CROWD_LABEL.moderate;
          const image = getVenueImage(venue, originalIndex);

          return (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#e9590c]/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={image}
                  alt={venue.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                <div
                  className={`absolute top-3 left-3 ${crowd.color}/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center shadow-sm`}
                >
                  <span
                    className={`w-1.5 h-1.5 bg-white rounded-full mr-1.5 ${
                      crowd.color === "bg-emerald-500" ? "animate-pulse" : ""
                    }`}
                  />
                  {crowd.text}
                </div>

                {venue.rating_avg > 0 && (
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center">
                    <Star size={12} className="text-[#e9590c] mr-1 fill-current" />
                    <span className="text-xs font-bold text-[#e9590c]">
                      {venue.rating_avg.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors truncate">
                    {venue.name}
                  </h3>
                  {venue.categories && venue.categories.length > 0 && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#e9590c]/10 text-[#e9590c] border border-[#e9590c]/20">
                      {(venue.categories.find((c) => c.is_primary) ?? venue.categories[0]).display_name}
                    </span>
                  )}
                </div>

                {venue.branch_name && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {venue.branch_name}
                  </p>
                )}

                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                  <MapPin size={14} className="mr-1 shrink-0" />
                  <span className="truncate">
                    {formatShortAddress(venue) || "—"}
                  </span>
                </div>

                {venue.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {venue.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            disabled={page === 0}
            className="size-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#e9590c]/40 hover:text-[#e9590c] disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-bold transition-colors ${
                page === index
                  ? "border-[#e9590c] bg-[#e9590c] text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-[#e9590c]/40 hover:text-[#e9590c]"
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, pageCount - 1))}
            disabled={page === pageCount - 1}
            className="size-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#e9590c]/40 hover:text-[#e9590c] disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
