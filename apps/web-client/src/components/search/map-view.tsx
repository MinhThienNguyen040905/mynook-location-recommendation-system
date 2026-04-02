"use client";

import { useMemo } from "react";
import { DynamicMap } from "@/components/map/dynamic-map";
import type { MapMarker } from "@/components/map/leaflet-map";
import { FloatingFilterPanel } from "./floating-filter-panel";
import type { MockVenue } from "@/data/mockVenues";
import "@/components/map/map-markers.css";

interface MapViewProps {
  isPanelOpen: boolean;
  onClosePanel: () => void;
  venues?: MockVenue[];
  selectedVenueId?: string | null;
  onVenueSelect?: (id: string) => void;
}

// Default center: HCMC
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

export function MapView({
  isPanelOpen,
  onClosePanel,
  venues = [],
  selectedVenueId,
  onVenueSelect,
}: MapViewProps) {
  const markers: MapMarker[] = useMemo(
    () =>
      venues.map((v) => ({
        id: v.id,
        lat: v.coordinates.lat,
        lng: v.coordinates.lng,
        label: PRICE_LABELS[v.priceLevel] || "$",
        popupContent: `<strong>${v.name}</strong><br/>${v.address}`,
      })),
    [venues],
  );

  const center: [number, number] = useMemo(() => {
    if (venues.length === 0) return DEFAULT_CENTER;
    const avgLat =
      venues.reduce((s, v) => s + v.coordinates.lat, 0) / venues.length;
    const avgLng =
      venues.reduce((s, v) => s + v.coordinates.lng, 0) / venues.length;
    return [avgLat, avgLng];
  }, [venues]);

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
