"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MOCK_VENUES } from "@/data/mockVenues";
import { FilterBar } from "@/components/search/filter-bar";
import { SearchVenueCard } from "@/components/search/search-venue-card";
import { MapView } from "@/components/search/map-view";

function SearchContent() {
  const searchParams = useSearchParams();
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // CSS for custom scrollbar hidden in global, we can inject it inline or class based
  return (
    // Note: 5rem is exactly h-20 (80px), matching the Navbar height.
    <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-[#f8f6f5] dark:bg-[#221610]">
      {/* Top Filter Bar */}
      <FilterBar
        onTogglePanel={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
      />

      {/* Split Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Venue List (60%) */}
        <div className="w-full lg:w-[60%] h-full overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {MOCK_VENUES.length} places found in SoHo
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Sort by:</span>
              <button className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                Recommended <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-4">
            {MOCK_VENUES.map((venue) => (
              <SearchVenueCard key={venue.id} venue={venue} />
            ))}
          </div>

          {/* Load More */}
          <div className="pt-6 flex justify-center pb-8">
            <button className="px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-nook-olive transition-colors shadow-sm">
              Load more places
            </button>
          </div>
        </div>

        {/* Right Side: Map (40%) */}
        <MapView
          isPanelOpen={isFilterPanelOpen}
          onClosePanel={() => setIsFilterPanelOpen(false)}
          venues={MOCK_VENUES}
        />
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-5rem)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-nook-olive border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
