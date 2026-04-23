"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { SearchVenueCard } from "@/components/search/search-venue-card";
import { MapView } from "@/components/search/map-view";
import { hybridSearchPublic } from "@/lib/api/search";
import type { SearchResult } from "@/types/venue";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setTotal(0);
        setHasSearched(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await hybridSearchPublic(q.trim());
        setResults(data.results);
        setTotal(data.total);
        setHasSearched(true);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
        setTotal(0);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Search on initial load if query param exists
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      doSearch(initialQuery);
    }
  }, [initialQuery, doSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`, {
        scroll: false,
      });
      doSearch(query.trim());
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-[#f8f6f5] dark:bg-[#221610]">
      {/* Search Input Bar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-3xl">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Quán cà phê yên tĩnh cho 5 người buổi tối..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#e9590c]/20 focus:border-[#e9590c]/50 outline-none transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-[#e9590c] hover:bg-[#c2410b] disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Split Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Venue List (60%) */}
        <div className="w-full lg:w-[60%] h-full overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isLoading ? (
                "Đang tìm kiếm..."
              ) : hasSearched ? (
                <>
                  {total} kết quả
                  {query && (
                    <span className="text-slate-400 font-normal">
                      {" "}cho &quot;{query}&quot;
                    </span>
                  )}
                </>
              ) : (
                "Nhập từ khóa để tìm kiếm"
              )}
            </h2>
            {results.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Sắp xếp:</span>
                <button className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                  Phù hợp nhất <ChevronDown size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-xl h-52 animate-pulse border border-slate-200 dark:border-slate-700"
                />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {results.map((venue) => (
                <SearchVenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && hasSearched && results.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-400 text-lg mb-2">
                Không tìm thấy kết quả
              </p>
              <p className="text-slate-400 text-sm">
                Thử tìm kiếm với từ khóa khác, ví dụ: &quot;quán cà phê yên tĩnh&quot;
              </p>
            </div>
          )}

          {/* Initial State */}
          {!isLoading && !hasSearched && (
            <div className="py-20 text-center">
              <Search size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                Tìm kiếm địa điểm
              </p>
              <p className="text-slate-400 text-sm">
                Sử dụng ngôn ngữ tự nhiên, ví dụ: &quot;quán cà phê cho 5 người buổi tối&quot;
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Map (40%) */}
        <MapView
          isPanelOpen={false}
          onClosePanel={() => {}}
          searchResults={results}
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
