"use client";

import { DynamicMap } from "@/components/map/dynamic-map";
import type { MapMarker } from "@/components/map/leaflet-map";
import { MapPin } from "lucide-react";

interface VenueLocationMapProps {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function VenueLocationMap({
  name,
  address,
  lat,
  lng,
}: VenueLocationMapProps) {
  const markers: MapMarker[] = [
    {
      id: "venue",
      lat,
      lng,
      popupContent: `<strong>${name}</strong><br/>${address}`,
    },
  ];

  return (
    <section>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <MapPin size={20} className="text-[#e9590c]" />
        Location
      </h3>
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="h-[300px]">
          <DynamicMap center={[lat, lng]} zoom={16} markers={markers} showUserLocation />
        </div>
        <div className="p-4 bg-white dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {address}
          </p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#e9590c] hover:text-[#c2410b] transition-colors"
          >
            <MapPin size={14} />
            Get Directions
          </a>
        </div>
      </div>
    </section>
  );
}
