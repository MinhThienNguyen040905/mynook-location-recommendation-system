"use client";
import {
  LocateFixed,
  Plus,
  Minus,
  Coffee,
  Utensils,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { FloatingFilterPanel } from "./floating-filter-panel";

interface MapViewProps {
  isPanelOpen: boolean;
  onClosePanel: () => void;
}

export function MapView({ isPanelOpen, onClosePanel }: MapViewProps) {
  return (
    <div className="hidden lg:block w-[40%] h-full relative bg-slate-200 dark:bg-slate-800 sticky top-0 overflow-hidden">
      {/* Background Map Simulation */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80 dark:opacity-60 mix-blend-multiply dark:mix-blend-normal"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000")',
        }}
      />
      <div className="absolute inset-0 bg-slate-200/30 dark:bg-slate-900/40" />

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button className="w-10 h-10 bg-white dark:bg-slate-800 rounded shadow-md text-slate-600 flex items-center justify-center hover:text-nook-olive">
          <LocateFixed size={20} />
        </button>
        <button className="w-10 h-10 bg-white dark:bg-slate-800 rounded shadow-md text-slate-600 flex items-center justify-center hover:text-nook-olive">
          <Plus size={20} />
        </button>
        <button className="w-10 h-10 bg-white dark:bg-slate-800 rounded shadow-md text-slate-600 flex items-center justify-center hover:text-nook-olive">
          <Minus size={20} />
        </button>
      </div>

      {/* Floating Filter Panel */}
      {isPanelOpen && <FloatingFilterPanel onClose={onClosePanel} />}

      {/* Map Pins */}
      <div className="absolute top-[40%] left-[45%] transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group">
        <div className="absolute inset-[-6px] rounded-full border-2 border-nook-olive animate-ping" />
        <div className="relative bg-nook-olive text-white font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white text-sm flex items-center gap-1 transition-transform hover:scale-110">
          <Coffee size={14} /> $$
        </div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-nook-olive" />
      </div>

      <div className="absolute top-[30%] left-[60%] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-10 group">
        <div className="bg-white text-slate-800 font-bold px-3 py-1.5 rounded-full shadow-md border border-slate-200 text-sm flex items-center gap-1 transition-all group-hover:bg-nook-olive group-hover:text-white group-hover:border-nook-olive">
          <Utensils size={14} /> $$$
        </div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white group-hover:border-t-nook-olive transition-colors" />
      </div>

      <div className="absolute top-[65%] left-[30%] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-10 group">
        <div className="bg-white text-slate-800 font-bold px-3 py-1.5 rounded-full shadow-md border border-slate-200 text-sm flex items-center gap-1 transition-all group-hover:bg-nook-olive group-hover:text-white group-hover:border-nook-olive">
          <BookOpen size={14} /> $
        </div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white group-hover:border-t-nook-olive transition-colors" />
      </div>

      {/* Search this area */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
        <button className="bg-white text-slate-700 text-sm font-medium px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-slate-200 flex items-center gap-2">
          <RefreshCw size={16} className="text-nook-olive" /> Search this area
        </button>
      </div>
    </div>
  );
}
