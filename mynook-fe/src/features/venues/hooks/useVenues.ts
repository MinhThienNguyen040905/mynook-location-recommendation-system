'use client';

import { useState, useEffect } from 'react';
import { venueService } from '@/features/venues/services';
import type { Venue } from '@/types/venue.types';

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    venueService
      .getAll()
      .then((res) => setVenues(res.data))
      .catch(() => setError('Failed to load venues'))
      .finally(() => setLoading(false));
  }, []);

  return { venues, loading, error };
}
