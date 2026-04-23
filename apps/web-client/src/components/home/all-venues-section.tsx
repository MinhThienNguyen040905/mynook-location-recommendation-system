import { Star, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getAllVenuesServer } from "@/lib/api/venues";
import type { Venue } from "@/types/venue";

const CROWD_LABEL: Record<string, { text: string; color: string }> = {
  empty: { text: "Empty", color: "bg-emerald-500" },
  moderate: { text: "Moderate", color: "bg-yellow-500" },
  crowded: { text: "Busy", color: "bg-orange-500" },
  full: { text: "Full", color: "bg-red-500" },
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

export async function AllVenuesSection() {
  const venues = await getAllVenuesServer();

  if (venues.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          All Venues
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Discover all the amazing places in our community.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {venues.map((venue, index) => {
          const crowd = CROWD_LABEL[venue.current_crowd_level] ?? CROWD_LABEL.moderate;
          const image = getVenueImage(venue, index);

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

                {/* Crowd Status Badge */}
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

                {/* Rating Badge */}
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors truncate">
                  {venue.name}
                </h3>

                {venue.branch_name && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {venue.branch_name}
                  </p>
                )}

                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                  <MapPin size={14} className="mr-1 shrink-0" />
                  <span className="truncate">
                    {venue.district ? `${venue.district}, ` : ""}
                    {venue.city}
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
    </section>
  );
}
