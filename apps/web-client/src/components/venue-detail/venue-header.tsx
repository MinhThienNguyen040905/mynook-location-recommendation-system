"use client";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";

export function VenueHeader() {
  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      <nav className="flex mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-[#e9590c] transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-[#e9590c] transition-colors">
          Venues
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 dark:text-white font-medium">
          The Workshop Coffee
        </span>
      </nav>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            The Workshop Coffee
          </h1>
          <div className="flex items-center text-slate-600 dark:text-slate-300 gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin className="text-[#e9590c]" size={16} />
              <span>123 Brew Lane, Coffee District</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="font-medium text-green-600 dark:text-green-400">
                Open
              </span>
              <span className="text-slate-400">•</span>
              <span>Closes 10 PM</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#e9590c]">
              <Star size={16} className="fill-current" />
              <span className="font-bold">4.8</span>
              <span className="underline cursor-pointer">(128 reviews)</span>
            </div>
          </div>
        </div>

        {/* Live Crowd Meter */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm w-full md:w-auto min-w-[280px]">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e9590c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e9590c]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Live Crowd
              </span>
            </div>
            <span className="text-[#e9590c] font-bold">40% Full</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
            <div
              className="bg-[#e9590c] h-2.5 rounded-full"
              style={{ width: "40%" }}
            ></div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Moderate - Good for groups
          </p>
        </div>
      </div>
    </div>
  );
}
