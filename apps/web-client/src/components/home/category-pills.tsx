"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tag as TagIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTags, type Tag } from "@/lib/api/tags";

const SCROLL_STEP = 240;

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get("q");

  const { data, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 5,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [data?.tags.length]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleClick = (tag: Tag) => {
    router.push(`/search?q=${encodeURIComponent(tag.display_name)}`);
  };

  const tags = data?.tags ?? [];

  // Ẩn hoàn toàn section khi đã load xong và không có tag
  if (!isLoading && tags.length === 0) return null;

  return (
    <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 sticky top-20 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
        {/* Left scroll button */}
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-SCROLL_STEP)}
            aria-label="Scroll left"
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 hover:border-[#e9590c] hover:text-[#e9590c] text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Right scroll button */}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollBy(SCROLL_STEP)}
            aria-label="Scroll right"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 hover:border-[#e9590c] hover:text-[#e9590c] text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-2 md:pb-0 md:justify-center"
        >
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 h-10 w-32 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
              />
            ))}

          {!isLoading &&
            tags.map((tag) => {
              const active = activeQuery === tag.display_name;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleClick(tag)}
                  className={cn(
                    "shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-full transition-all whitespace-nowrap",
                    active
                      ? "bg-[#e9590c] text-white shadow-md shadow-[#e9590c]/20 hover:-translate-y-0.5"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#e9590c] hover:text-[#e9590c]",
                  )}
                >
                  <TagIcon size={16} />
                  <span className="text-sm font-semibold">
                    {tag.display_name}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
