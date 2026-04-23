"use client";

import { useMemo } from "react";
import { DynamicMap } from "@/components/map/dynamic-map";
import type { MapMarker } from "@/components/map/leaflet-map";
import { FloatingFilterPanel } from "./floating-filter-panel";
import type { SearchResult } from "@/types/venue";
import "@/components/map/map-markers.css";

interface MapViewProps {
  isPanelOpen: boolean;
  onClosePanel: () => void;
  searchResults?: SearchResult[];
  selectedVenueId?: string | null;
  onVenueSelect?: (id: string) => void;
}

// Default center: HCMC
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

export function MapView({
  isPanelOpen,
  onClosePanel,
  searchResults = [],
  selectedVenueId,
  onVenueSelect,
}: MapViewProps) {
  const markers: MapMarker[] = useMemo(
    () =>
      searchResults.map((v) => ({
        id: v.id,
        lat: v.latitude,
        lng: v.longitude,
        label: v.rating_avg > 0 ? v.rating_avg.toFixed(1) : "•",
        popupContent: `<strong>${v.name}</strong><br/>${v.address}`,
      })),
    [searchResults],
  );

  const center: [number, number] = useMemo(() => {
    if (searchResults.length === 0) return DEFAULT_CENTER;
    const avgLat =
      searchResults.reduce((s, v) => s + v.latitude, 0) / searchResults.length;
    const avgLng =
      searchResults.reduce((s, v) => s + v.longitude, 0) / searchResults.length;
    return [avgLat, avgLng];
  }, [searchResults]);

  return (
    <div className="hidden lg:block w-[40%] h-full relative sticky top-0 overflow-hidden">
      <DynamicMap
        center={center}
        zoom={13}
        markers={markers}
        selectedMarkerId={selectedVenueId}
        showUserLocation
        onMarkerClick={onVenueSelect}
      />

      {/* Floating Filter Panel */}
      {isPanelOpen && <FloatingFilterPanel onClose={onClosePanel} />}
    </div>
  );
}
