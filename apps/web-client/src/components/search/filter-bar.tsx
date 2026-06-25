"use client";
import {
  Laptop,
  Utensils,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface FilterBarProps {
  onTogglePanel: () => void;
}

export function FilterBar({ onTogglePanel }: FilterBarProps) {
  return (
    <div className="px-6 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Mode Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mr-2 shrink-0">
        <button className="px-3 py-1 rounded bg-white dark:bg-slate-700 shadow-sm text-nook-olive text-sm font-medium flex items-center gap-1">
          <Laptop size={16} /> Làm việc
        </button>
        <button className="px-3 py-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1 transition-colors">
          <Utensils size={16} /> Ăn uống
        </button>
      </div>

      {/* Filter Buttons */}
      <button className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shrink-0">
        Giá <ChevronDown size={14} />
      </button>

      <button className="px-4 py-1.5 rounded-full border border-nook-olive bg-nook-olive/10 text-nook-olive text-sm font-medium flex items-center gap-1 shrink-0">
        Đánh giá: 4.0+ <X size={14} />
      </button>

      <button className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 flex items-center gap-1 shrink-0">
        Ẩm thực <ChevronDown size={14} />
      </button>

      <button className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 flex items-center gap-1 shrink-0">
        Tiện ích <ChevronDown size={14} />
      </button>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

      {/* More Filters Trigger */}
      <button
        onClick={onTogglePanel}
        className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 flex items-center gap-1 transition-colors ml-auto shrink-0"
      >
        <SlidersHorizontal size={14} />
        Bộ lọc khác
      </button>
    </div>
  );
}
