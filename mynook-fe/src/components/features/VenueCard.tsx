import { MapPin, Star } from 'lucide-react';
import type { Venue } from '@/types/venue.types';

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="font-semibold text-lg">{venue.name}</h3>
      <p className="text-sm text-gray-500 flex items-center gap-1">
        <MapPin size={14} /> {venue.address}
      </p>
      <p className="text-sm flex items-center gap-1">
        <Star size={14} className="text-yellow-400" />
        {venue.rating.toFixed(1)}
        <span className="text-gray-400">({venue.reviewCount})</span>
      </p>
    </div>
  );
}
