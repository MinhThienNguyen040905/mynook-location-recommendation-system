"use client";
import { X, Laptop, Utensils, Check } from "lucide-react";

interface FloatingFilterPanelProps {
  onClose: () => void;
}

export function FloatingFilterPanel({ onClose }: FloatingFilterPanelProps) {
  return (
    <div className="absolute top-4 right-6 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-30 p-5 hidden xl:block">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
          Filters
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Mode
        </label>
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex">
          <button className="flex-1 py-2 rounded-md bg-white dark:bg-slate-700 shadow-sm text-nook-olive font-medium text-sm flex justify-center items-center gap-2">
            <Laptop size={16} /> Work Mode
          </button>
          <button className="flex-1 py-2 rounded-md text-slate-500 dark:text-slate-400 font-medium text-sm flex justify-center items-center gap-2 hover:text-slate-700">
            <Utensils size={16} /> Eat Mode
          </button>
        </div>
      </div>

      {/* Essentials */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Essentials
        </label>
        <div className="space-y-3">
          {["Power Outlets", "Quiet Zone", "Fast Wi-Fi (>50mbps)"].map(
            (item, idx) => (
              <label
                key={item}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    idx === 0
                      ? "bg-nook-olive border-nook-olive"
                      : "border-slate-300 bg-white group-hover:border-nook-olive"
                  }`}
                >
                  {idx === 0 && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {item}
                </span>
              </label>
            ),
          )}
        </div>
      </div>

      {/* Switch */}
      <div className="mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Show empty seats only
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nook-olive"></div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Reset
        </button>
        <button className="flex-[2] py-2 bg-nook-olive hover:bg-nook-olive/90 text-white text-sm font-bold rounded-lg shadow-md transition-all">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
