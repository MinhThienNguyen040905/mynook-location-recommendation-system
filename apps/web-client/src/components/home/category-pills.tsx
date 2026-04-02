"use client";
import { Utensils, Coffee, Laptop, Users, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Dining", icon: Utensils, active: true },
  { name: "Cafe", icon: Coffee, active: false },
  { name: "Work/Study", icon: Laptop, active: false },
  { name: "Group Meeting", icon: Users, active: false },
  { name: "Open Late", icon: Moon, active: false },
];

export function CategoryPills() {
  return (
    <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 sticky top-20 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2 md:pb-0 md:justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className={cn(
                "flex items-center space-x-2 px-5 py-2.5 rounded-full transition-all whitespace-nowrap",
                cat.active
                  ? "bg-[#e9590c] text-white shadow-md shadow-[#e9590c]/20 hover:-translate-y-0.5"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#e9590c] hover:text-[#e9590c]",
              )}
            >
              <cat.icon size={16} />
              <span className="text-sm font-semibold">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
