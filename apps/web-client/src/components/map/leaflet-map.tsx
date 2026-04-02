"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths (Leaflet + bundlers issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  popupContent?: string;
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: string | null;
  showUserLocation?: boolean;
  onMarkerClick?: (id: string) => void;
  onMoveEnd?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  className?: string;
}

export function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  selectedMarkerId,
  showUserLocation = false,
  onMarkerClick,
  onMoveEnd,
  className = "",
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tileUrl =
      process.env["NEXT_PUBLIC_MAP_TILE_URL"] ||
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    if (onMoveEnd) {
      map.on("moveend", () => {
        const bounds = map.getBounds();
        onMoveEnd({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show user's current location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showUserLocation) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng = L.latLng(latitude, longitude);

        // Blue dot for user position
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latlng);
        } else {
          userMarkerRef.current = L.circleMarker(latlng, {
            radius: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            color: "#ffffff",
            weight: 3,
          }).addTo(map);
          userMarkerRef.current.bindPopup("Vị trí của bạn");
        }

        // Accuracy circle
        if (userAccuracyRef.current) {
          userAccuracyRef.current.setLatLng(latlng);
          userAccuracyRef.current.setRadius(accuracy);
        } else {
          userAccuracyRef.current = L.circle(latlng, {
            radius: accuracy,
            fillColor: "#4285F4",
            fillOpacity: 0.1,
            color: "#4285F4",
            weight: 1,
          }).addTo(map);
        }
      },
      () => {
        // Geolocation denied or unavailable — silently ignore
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyRef.current) {
        userAccuracyRef.current.remove();
        userAccuracyRef.current = null;
      }
    };
  }, [showUserLocation]);

  // Update markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    markers.forEach((m) => {
      const isSelected = m.id === selectedMarkerId;

      const icon = m.label
        ? L.divIcon({
            className: "custom-map-marker",
            html: `<div class="map-pin ${isSelected ? "map-pin--active" : ""}">${m.label}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          })
        : new L.Icon.Default();

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layer);

      if (m.popupContent) {
        marker.bindPopup(m.popupContent);
      }

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(m.id));
      }
    });
  }, [markers, selectedMarkerId, onMarkerClick]);

  // Fly to center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  return <div ref={containerRef} className={`w-full h-full ${className}`} />;
}
