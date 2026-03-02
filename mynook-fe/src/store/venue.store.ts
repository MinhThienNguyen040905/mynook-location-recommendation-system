import { create } from 'zustand';
import type { Venue } from '@/types/venue.types';

interface VenueState {
  venues: Venue[];
  selectedVenue: Venue | null;
  setVenues: (venues: Venue[]) => void;
  setSelectedVenue: (venue: Venue | null) => void;
}

export const useVenueStore = create<VenueState>((set) => ({
  venues: [],
  selectedVenue: null,
  setVenues: (venues) => set({ venues }),
  setSelectedVenue: (venue) => set({ selectedVenue: venue }),
}));
