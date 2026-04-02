import { ArrowRight, Star, Heart } from "lucide-react";
import Link from "next/link";

const TRENDING_DATA = [
  {
    id: 1,
    name: "The Bean Hive",
    image:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
    status: { text: "Plenty of Seats", color: "bg-emerald-500" },
    rating: 4.8,
    price: "$$",
    type: "Cafe & Bakery",
    distance: "0.4 mi",
    tags: ["Wifi", "Outlets", "Quiet"],
  },
  {
    id: 2,
    name: "Pasta & Vine",
    image:
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=800",
    status: { text: "Busy", color: "bg-orange-500" },
    rating: 4.6,
    price: "$$$",
    type: "Italian Dining",
    distance: "1.2 mi",
    tags: ["Outdoor Seating", "Wine Bar"],
  },
  {
    id: 3,
    name: "Focus Hub",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    status: { text: "Moderate Traffic", color: "bg-yellow-500" },
    rating: 4.9,
    price: "$",
    type: "Workspace",
    distance: "0.8 mi",
    tags: ["Fast Wifi", "Meeting Rooms", "Coffee"],
  },
];

export function TrendingSection() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Trending Near You
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Highly rated spots curated for you.
          </p>
        </div>
        <Link
          href="/search"
          className="hidden sm:flex items-center text-[#e9590c] font-semibold hover:text-[#e9590c]/80 transition-colors"
        >
          View all <ArrowRight size={16} className="ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {TRENDING_DATA.map((venue) => (
          <div
            key={venue.id}
            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#e9590c]/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={venue.image}
                alt={venue.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

              {/* Status Badge */}
              <div
                className={`absolute top-4 left-4 ${venue.status.color}/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm`}
              >
                <span
                  className={`w-2 h-2 bg-white rounded-full mr-2 ${
                    venue.status.color === "bg-emerald-500"
                      ? "animate-pulse"
                      : ""
                  }`}
                />
                {venue.status.text}
              </div>

              {/* Heart Icon */}
              <button className="absolute top-4 right-4 bg-white/20 hover:bg-white backdrop-blur-md p-2 rounded-full text-white hover:text-[#e9590c] transition-colors">
                <Heart size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#e9590c] transition-colors">
                  {venue.name}
                </h3>
                <div className="flex items-center bg-[#e9590c]/10 px-2 py-1 rounded-lg">
                  <Star
                    size={14}
                    className="text-[#e9590c] mr-1 fill-current"
                  />
                  <span className="text-sm font-bold text-[#e9590c]">
                    {venue.rating}
                  </span>
                </div>
              </div>

              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {venue.price}
                </span>
                <span className="mx-2">•</span>
                <span>{venue.type}</span>
                <span className="mx-2">•</span>
                <span>{venue.distance}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {venue.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
