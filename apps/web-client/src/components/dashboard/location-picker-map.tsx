'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundler issue)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

// HCM default center
const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

function DraggableMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (marker) {
            const latlng = marker.getLatLng();
            onChange(latlng.lat, latlng.lng);
          }
        },
      }}
    />
  );
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMapProps) {
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const mapRef = useRef<L.Map>(null);

  const lat = latitude || DEFAULT_LAT;
  const lng = longitude || DEFAULT_LNG;

  // Auto-locate on first render if no position set
  useEffect(() => {
    if (located) return;
    if (latitude && longitude) {
      setLocated(true);
      return;
    }
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        onChange(newLat, newLng);
        setLocated(true);
        setLocating(false);
        mapRef.current?.flyTo([newLat, newLng], 16, { duration: 1 });
      },
      () => {
        setLocating(false);
        setLocated(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          />
          <DraggableMarker position={[lat, lng]} onChange={onChange} />
        </MapContainer>

        {locating && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-[1000]">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow text-sm text-gray-600">
              <span className="size-4 border-2 border-nook-olive/40 border-t-nook-olive rounded-full animate-spin" />
              Đang xác định vị trí...
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Kéo marker hoặc nhấp vào bản đồ để chọn vị trí.
          Tọa độ: <span className="font-mono text-gray-500">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
        </p>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="text-xs text-nook-olive hover:underline disabled:opacity-50"
        >
          Vị trí hiện tại
        </button>
      </div>
    </div>
  );
}
