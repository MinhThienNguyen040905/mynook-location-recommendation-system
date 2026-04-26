"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { History, Star, MapPin } from "lucide-react";
import { getVenueById } from "@/lib/api/venues";
import { getRecentlyViewed, type RecentlyViewedVenue } from "@/lib/api/interactions";
import { useAuthStore } from "@/stores/auth-store";
import { useRecentlyViewedIds } from "@/hooks/use-recently-viewed";
import type { Venue } from "@/types/venue";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
];

const VISIBLE = 8;

interface CardData {
  id: string;
  name: string;
  ward: string | null;
  district_name: string | null;
  city_name: string | null;
  media: string[];
  rating_avg: number;
  primary_category_name: string | null;
}

function pickImage(media: string[], i: number): string {
  return media?.[0] ?? PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
}

function shortAddress(parts: { ward: string | null; district_name: string | null; city_name: string | null }): string {
  return [parts.ward, parts.district_name, parts.city_name].filter(Boolean).join(", ");
}

function fromApi(v: RecentlyViewedVenue): CardData {
  return {
    id: v.venue_id,
    name: v.name,
    ward: v.ward,
    district_name: v.district_name,
    city_name: v.city_name,
    media: v.media ?? [],
    rating_avg: v.rating_avg,
    primary_category_name: v.primary_category_name,
  };
}

function fromVenue(v: Venue): CardData {
  const primary = v.categories?.find((c) => c.is_primary) ?? v.categories?.[0];
  return {
    id: v.id,
    name: v.name,
    ward: v.ward,
    district_name: v.district_ref?.name ?? null,
    city_name: v.city_ref?.name ?? null,
    media: v.media ?? [],
    rating_avg: v.rating_avg ?? 0,
    primary_category_name: primary?.display_name ?? null,
  };
}

export function RecentlyViewedSection() {
  const user = useAuthStore((s) => s.user);
  const localIds = useRecentlyViewedIds();

  // Logged-in users — pull from server (cross-device).
  const { data: serverRecent = [] } = useQuery({
    queryKey: ["recently-viewed", user?.id],
    queryFn: () => getRecentlyViewed(VISIBLE),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  // Anonymous users — fall back to localStorage.
  const anonIds = useMemo(
    () => (user ? [] : localIds.slice(0, VISIBLE)),
    [user, localIds],
  );

  const anonQueries = useQueries({
    queries: anonIds.map((id) => ({
      queryKey: ["venue", id],
      queryFn: () => getVenueById(id),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  });

  const cards: CardData[] = useMemo(() => {
    if (user) return serverRecent.map(fromApi);
    return anonQueries
      .map((q) => q.data)
      .filter((v): v is Venue => !!v && v.is_active)
      .map(fromVenue);
  }, [user, serverRecent, anonQueries]);

  if (cards.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <History size={22} className="text-[#e9590c]" />
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Recently Viewed
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Bạn vừa xem những quán này.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        {cards.map((c, i) => (
          <Link
            key={c.id}
            href={`/venues/${c.id}`}
            className="group shrink-0 w-64 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#e9590c]/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50"
          >
            <div className="relative h-36 overflow-hidden">
              <img
                src={pickImage(c.media, i)}
                alt={c.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
              {c.rating_avg > 0 && (
                <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center">
                  <Star size={10} className="text-[#e9590c] mr-1 fill-current" />
                  <span className="text-[11px] font-bold text-[#e9590c]">
                    {c.rating_avg.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors truncate">
                  {c.name}
                </h3>
                {c.primary_category_name && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#e9590c]/10 text-[#e9590c] border border-[#e9590c]/20">
                    {c.primary_category_name}
                  </span>
                )}
              </div>
              <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                <MapPin size={11} className="mr-1 shrink-0" />
                <span className="truncate">{shortAddress(c) || "—"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
