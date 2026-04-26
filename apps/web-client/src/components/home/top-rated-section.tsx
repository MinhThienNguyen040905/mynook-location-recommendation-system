import { ArrowRight, Star, MapPin, Flame } from "lucide-react";
import Link from "next/link";
import { getTopRatedVenuesServer } from "@/lib/api/venues";
import { formatShortAddress } from "@/lib/utils";
import type { Venue } from "@/types/venue";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
];

function pickImage(venue: Venue, index: number): string {
  if (venue.media && venue.media.length > 0) return venue.media[0];
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

export async function TopRatedSection() {
  const venues = await getTopRatedVenuesServer(7, 6);
  if (venues.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={22} className="text-[#e9590c]" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Top Rated This Week
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Hot tuần này — những quán đang được yêu thích nhất.
          </p>
        </div>
        <Link
          href="/search?sort=rating"
          className="hidden sm:flex items-center text-[#e9590c] font-semibold hover:text-[#e9590c]/80 transition-colors"
        >
          View all <ArrowRight size={16} className="ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue, i) => {
          const primary = venue.categories?.find((c) => c.is_primary) ?? venue.categories?.[0];
          return (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#e9590c]/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={pickImage(venue, i)}
                  alt={venue.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                <div className="absolute top-3 left-3 bg-[#e9590c]/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center shadow-sm">
                  <span className="mr-1">#{i + 1}</span>
                  Trending
                </div>
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center">
                  <Star size={12} className="text-[#e9590c] mr-1 fill-current" />
                  <span className="text-xs font-bold text-[#e9590c]">
                    {venue.rating_avg.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors truncate">
                    {venue.name}
                  </h3>
                  {primary && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#e9590c]/10 text-[#e9590c] border border-[#e9590c]/20">
                      {primary.display_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={14} className="mr-1 shrink-0" />
                  <span className="truncate">{formatShortAddress(venue) || "—"}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  {venue.review_count} đánh giá
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
