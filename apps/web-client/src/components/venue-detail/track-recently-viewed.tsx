"use client";
import { useEffect } from "react";
import { useTrackRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useAuthStore } from "@/stores/auth-store";
import { trackVenueView } from "@/lib/api/interactions";

export function TrackRecentlyViewed({ venueId }: { venueId: string }) {
  // Always keep a local fallback so anonymous users still see the carousel.
  useTrackRecentlyViewed(venueId);

  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!user?.id || !venueId) return;
    // Fire-and-forget — recently-viewed is non-critical UX.
    trackVenueView(venueId).catch(() => undefined);
  }, [user?.id, venueId]);

  return null;
}
