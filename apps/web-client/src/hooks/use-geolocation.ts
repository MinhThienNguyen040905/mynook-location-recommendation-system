'use client';

import { useEffect, useRef, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
  /** Accuracy in metres (browser-reported) */
  accuracy: number;
}

export type GeolocationStatus =
  | 'idle'        // not asked yet
  | 'pending'     // waiting on browser
  | 'granted'     // got coords
  | 'denied'      // user blocked
  | 'unavailable' // browser/OS doesn't support / no signal
  | 'error';

interface UseGeolocationResult {
  coords: Coords | null;
  status: GeolocationStatus;
  error: string | null;
  request: () => void;
  clear: () => void;
}

const STORAGE_KEY = 'mynook:last-coords';

/**
 * Browser geolocation with explicit consent gate.
 *
 * - `request()` triggers the browser permission prompt. We DON'T auto-request
 *   on mount because that fires the prompt before the user has any reason
 *   to grant it; consumers should attach `request` to a button or interaction.
 * - On success the result is mirrored to localStorage so subsequent visits
 *   can use the last known position immediately while a fresh fix arrives.
 */
export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<Coords | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Coords) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watcherRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation?.clearWatch(watcherRef.current);
      }
    };
  }, []);

  function request() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setError('Trình duyệt không hỗ trợ định vị');
      return;
    }
    setStatus('pending');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCoords(c);
        setStatus('granted');
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Bạn đã từ chối truy cập vị trí');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('unavailable');
          setError('Không lấy được tín hiệu vị trí');
        } else {
          setStatus('error');
          setError(err.message || 'Lỗi không xác định');
        }
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10_000 },
    );
  }

  function clear() {
    setCoords(null);
    setStatus('idle');
    setError(null);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return { coords, status, error, request, clear };
}
