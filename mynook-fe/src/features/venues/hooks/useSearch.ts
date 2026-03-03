'use client';

import { useState } from 'react';
import { venueService } from '@/features/venues/services';
import type { Venue } from '@/types/venue.types';

export function useSearch() {
  const [results, setResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const search = async (q: string) => {
    setQuery(q);
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await venueService.search(q);
      setResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, query, search };
}
