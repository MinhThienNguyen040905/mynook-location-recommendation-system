"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Star, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getRecommended, type RecommendedVenue } from "@/lib/api/interactions";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
];

function pickImage(v: RecommendedVenue, i: number): string {
  return v.media?.[0] ?? PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
}

function formatShortAddress(v: RecommendedVenue): string {
  return [v.ward, v.district_name, v.city_name].filter(Boolean).join(", ");
}

export function RecommendedSection() {
  const user = useAuthStore((s) => s.user);

  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended-for-you", user?.id],
    queryFn: () => getRecommended(6),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  if (!user) return null;
  if (recommended.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={22} className="text-[#e9590c]" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Recommended For You
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Gợi ý riêng cho bạn dựa trên các quán bạn đã yêu thích và đánh giá tốt.
          </p>
        </div>
        <Link
          href="/search"
          className="hidden sm:flex items-center text-[#e9590c] font-semibold hover:text-[#e9590c]/80 transition-colors"
        >
          View all <ArrowRight size={16} className="ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommended.map((venue, i) => (
          <Link
            key={venue.id}
            href={`/venues/${venue.id}`}
            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#e9590c]/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={pickImage(venue, i)}
                alt={venue.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
              <div className="absolute top-3 left-3 bg-[#e9590c]/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                For You
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors truncate">
                  {venue.name}
                </h3>
                {venue.primary_category_name && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#e9590c]/10 text-[#e9590c] border border-[#e9590c]/20">
                    {venue.primary_category_name}
                  </span>
                )}
              </div>
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                <MapPin size={12} className="mr-1 shrink-0" />
                <span className="truncate">{formatShortAddress(venue) || "—"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
