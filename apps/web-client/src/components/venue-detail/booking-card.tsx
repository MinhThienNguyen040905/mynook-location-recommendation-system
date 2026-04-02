"use client";
import { Calendar, Lightbulb, ArrowRight } from "lucide-react";

export function BookingCard() {
  return (
    <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
        Book a table
      </h3>
      <form className="space-y-4">
        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="text-slate-400" size={18} />
            </div>
            <input
              type="date"
              defaultValue="2026-10-27"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* Time & Guests Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Time
            </label>
            <select className="block w-full py-2.5 px-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm outline-none">
              <option>09:00 AM</option>
              <option>09:30 AM</option>
              <option defaultValue="10:00 AM">10:00 AM</option>
              <option>10:30 AM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Guests
            </label>
            <select className="block w-full py-2.5 px-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm outline-none">
              <option>1 Person</option>
              <option defaultValue="2 People">2 People</option>
              <option>3 People</option>
              <option>4+ Group</option>
            </select>
          </div>
        </div>

        {/* Smart Tip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 flex gap-3">
          <Lightbulb className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-snug">
            <span className="font-bold">Smart Tip:</span> Ordering food in
            advance saves ~15 mins during peak hours.
          </p>
        </div>

        <div className="pt-2">
          <div className="flex items-center mb-2">
            <input
              id="pre-order"
              type="checkbox"
              className="h-4 w-4 text-[#e9590c] focus:ring-[#e9590c] border-slate-300 rounded cursor-pointer"
            />
            <label
              htmlFor="pre-order"
              className="ml-2 block text-sm text-slate-900 dark:text-slate-300 cursor-pointer"
            >
              I want to pre-order food
            </label>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700 my-4" />

        {/* Booking Summary */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Reservation Fee
          </span>
          <span className="font-medium text-slate-900 dark:text-white">
            Free
          </span>
        </div>

        <button
          type="button"
          className="w-full bg-[#e9590c] hover:bg-[#c2410b] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#e9590c]/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
        >
          Confirm Booking
          <ArrowRight size={16} />
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          No credit card required
        </p>
      </form>
    </div>
  );
}
