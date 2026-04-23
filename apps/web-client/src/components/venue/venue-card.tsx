'use client';

import Link from 'next/link';
import { Star, MapPin, Coffee, Wifi, VolumeX, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { MockVenue } from '@/data/mockVenues';
import { cn } from '@/lib/utils';

interface VenueCardProps {
  venue: MockVenue;
  className?: string;
}

export function VenueCard({ venue, className }: VenueCardProps) {
  const featureIcons: Record<string, React.ReactNode> = {
    Quiet: <VolumeX size={14} />,
    'Fast Wi-Fi': <Wifi size={14} />,
    'Power Outlets': <Zap size={14} />,
    'Great Coffee': <Coffee size={14} />,
  };

  return (
    <motion.div whileHover={{ y: -4 }} className={cn('nook-card group', className)}>
      {/* href changed from /venue/ → /venues/ to match Next.js route */}
      <Link href={`/venues/${venue.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* Using <img> for external picsum URLs — upgrade to next/image later */}
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-nook-olive">
            <Star size={14} fill="currentColor" />
            <span>{venue.rating}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex flex-wrap gap-2">
              {venue.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white text-[10px] uppercase tracking-wider font-bold rounded-full border border-white/30"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-serif font-bold text-nook-ink mb-1 group-hover:text-nook-olive transition-colors">
            {venue.name}
          </h3>
          <div className="flex items-center gap-1 text-nook-ink/60 text-sm mb-3">
            <MapPin size={14} />
            <span className="truncate">{venue.address}</span>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            {venue.features.slice(0, 3).map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-1.5 text-xs text-nook-olive font-medium bg-nook-olive/5 px-2 py-1 rounded-md"
              >
                {featureIcons[feature] || <Zap size={14} />}
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-nook-sand">
            <div className="flex items-center gap-0.5">
              {[...Array(4)].map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-sm font-bold',
                    i < venue.priceLevel ? 'text-nook-olive' : 'text-nook-sand'
                  )}
                >
                  $
                </span>
              ))}
            </div>
            <span className="text-xs text-nook-ink/40 font-medium">{venue.reviewCount} reviews</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
