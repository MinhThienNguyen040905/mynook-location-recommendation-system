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
  highlightedVenueId?: string | null;
  onVenueSelect?: (id: string) => void;
  onVenueHover?: (id: string | null) => void;
}

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

export function MapView({
  isPanelOpen,
  onClosePanel,
  searchResults = [],
  selectedVenueId,
  highlightedVenueId,
  onVenueSelect,
  onVenueHover,
}: MapViewProps) {
  const markers: MapMarker[] = useMemo(
    () =>
      searchResults
        .filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
        .map((v) => ({
          id: v.id,
          lat: v.latitude,
          lng: v.longitude,
          label: v.rating_avg > 0 ? v.rating_avg.toFixed(1) : "•",
          popupContent: `<strong>${v.name}</strong><br/>${v.address}`,
        })),
    [searchResults],
  );

  const center: [number, number] = useMemo(() => {
    if (markers.length === 0) return DEFAULT_CENTER;

    const avgLat = markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length;
    const avgLng = markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length;
    return [avgLat, avgLng];
  }, [markers]);

  return (
    <div className="hidden lg:block w-[40%] h-full relative sticky top-0 overflow-hidden">
      <DynamicMap
        center={center}
        zoom={13}
        markers={markers}
        selectedMarkerId={highlightedVenueId ?? selectedVenueId}
        fitToMarkers={markers.length > 0}
        showUserLocation
        onMarkerClick={onVenueSelect}
        onMarkerHover={onVenueHover}
      />

      {isPanelOpen && <FloatingFilterPanel onClose={onClosePanel} />}
    </div>
  );
}
