"use client";
import { Heart, Star, BadgeCheck, Quote } from "lucide-react";
import type { MockVenue } from "@/data/mockVenues";

interface SearchVenueCardProps {
  venue: MockVenue;
}

export function SearchVenueCard({ venue }: SearchVenueCardProps) {
  // Deterministic mock value derived from venue id to avoid hydration mismatch
  const crowdLevel = venue.id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 100;
  const crowdStatus =
    crowdLevel > 75 ? "Busy" : crowdLevel > 40 ? "Moderate" : "Quiet";
  const crowdColor =
    crowdLevel > 75
      ? "bg-orange-500 text-orange-600"
      : crowdLevel > 40
      ? "bg-yellow-500 text-yellow-600"
      : "bg-green-500 text-green-600";

  return (
    <article className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-nook-olive/50 hover:shadow-md transition-all group cursor-pointer flex flex-col sm:flex-row overflow-hidden h-auto sm:h-52">
      {/* Image Section */}
      <div className="w-full sm:w-64 h-48 sm:h-full relative shrink-0">
        <img
          src={venue.images[0]}
          alt={venue.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 shadow-sm">
          {venue.categories[0]}
        </div>
        <button className="absolute top-3 right-3 p-1.5 rounded-full bg-white/50 hover:bg-white text-slate-700 hover:text-red-500 transition-colors backdrop-blur-sm">
          <Heart size={20} />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-nook-olive transition-colors flex items-center gap-1">
              {venue.name}
              <BadgeCheck className="text-blue-500" size={18} />
            </h3>
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              OPEN
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <span className="flex items-center gap-1 text-yellow-500 font-medium">
              {venue.rating} <Star size={14} className="fill-current" />
              <span className="text-slate-400 font-normal">
                ({venue.reviewCount})
              </span>
            </span>
            <span>•</span>
            <span>{venue.categories.join(" & ")}</span>
            <span>•</span>
            <span>{"$".repeat(venue.priceLevel)}</span>
          </div>

          {/* Crowding Meter */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Live Crowding</span>
              <span className={`font-medium ${crowdColor.split(" ")[1]}`}>
                {crowdStatus} ({crowdLevel}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${crowdColor.split(" ")[0]} rounded-full`}
                style={{ width: `${crowdLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quote Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 italic line-clamp-1 flex items-center gap-1">
            <Quote size={14} className="text-nook-olive/40 shrink-0" />
            {venue.description.substring(0, 80)}...
          </p>
        </div>
      </div>
    </article>
  );
}
