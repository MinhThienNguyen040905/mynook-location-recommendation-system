'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation'; // replaces react-router-dom useParams
import Link from 'next/link';
import {
  Star,
  MapPin,
  Clock,
  Share2,
  Heart,
  ArrowLeft,
  Coffee,
  Wifi,
  VolumeX,
  Zap,
  ChevronRight,
  ChevronLeft,
  Plus,
  Info,
} from 'lucide-react';
import { MOCK_VENUES } from '@/data/mockVenues';
import { cn } from '@/lib/utils';

export default function VenueDetailPage() {
  // useParams from next/navigation — same usage as react-router-dom
  const { id } = useParams<{ id: string }>();
  const venue = useMemo(() => MOCK_VENUES.find((v) => v.id === id), [id]);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-nook-sand rounded-full flex items-center justify-center mb-6 text-nook-ink/20">
          <MapPin size={48} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-nook-ink mb-4">Venue not found</h2>
        <p className="text-nook-ink/60 mb-8 max-w-md">
          The nook you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        {/* Next.js Link — href replaces to */}
        <Link href="/search" className="nook-button-primary">
          Back to Search
        </Link>
      </div>
    );
  }

  const featureIcons: Record<string, React.ReactNode> = {
    Quiet: <VolumeX size={20} />,
    'Fast Wi-Fi': <Wifi size={20} />,
    'Power Outlets': <Zap size={20} />,
    'Great Coffee': <Coffee size={20} />,
    'Ergonomic Chairs': <Zap size={20} />,
    'Outdoor Seating': <Zap size={20} />,
    'Pet Friendly': <Zap size={20} />,
    'Private Pods': <Zap size={20} />,
    'Meeting Rooms': <Zap size={20} />,
    'Free Coffee': <Zap size={20} />,
    Printing: <Zap size={20} />,
    'Garden View': <Zap size={20} />,
    'Traditional Tea': <Zap size={20} />,
    'Shoes Off': <Zap size={20} />,
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-nook-sand px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back link — href replaces to */}
          <Link
            href="/search"
            className="flex items-center gap-2 text-nook-ink/60 hover:text-nook-olive transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            <span>Back to results</span>
          </Link>
          <div className="flex items-center gap-3">
            <button className="p-2 text-nook-ink/60 hover:text-nook-olive transition-colors">
              <Share2 size={20} />
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                'p-2 transition-colors',
                isFavorite ? 'text-red-500' : 'text-nook-ink/60 hover:text-red-500'
              )}
            >
              <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden group">
            {/* Using <img> for external picsum URLs */}
            <img
              src={venue.images[activeImage]}
              alt={venue.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />

            {venue.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev === 0 ? venue.images.length - 1 : prev - 1))
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-nook-ink hover:bg-white transition-all shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev === venue.images.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-nook-ink hover:bg-white transition-all shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <div className="hidden lg:grid grid-rows-2 gap-6">
            {venue.images.slice(1, 3).map((img, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden relative group cursor-pointer"
                onClick={() => setActiveImage(i + 1)}
              >
                <img
                  src={img}
                  alt={`${venue.name} ${i + 2}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                {i === 1 && venue.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl">
                    +{venue.images.length - 3} photos
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {venue.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 bg-nook-olive/10 text-nook-olive text-xs font-bold uppercase tracking-wider rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <h1 className="text-5xl font-serif font-bold text-nook-ink mb-4 leading-tight">
                {venue.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-nook-ink/60">
                <div className="flex items-center gap-1 text-nook-olive font-bold">
                  <Star size={18} fill="currentColor" />
                  <span>{venue.rating}</span>
                  <span className="text-nook-ink/40 font-medium ml-1">
                    ({venue.reviewCount} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={18} />
                  <span>{venue.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={18} />
                  <span>{venue.openingHours}</span>
                </div>
              </div>
            </div>

            <div className="prose prose-nook max-w-none mb-12">
              <h3 className="text-2xl font-serif font-bold text-nook-ink mb-4">
                About this Nook
              </h3>
              <p className="text-lg text-nook-ink/70 leading-relaxed">{venue.description}</p>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-serif font-bold text-nook-ink mb-6">
                What this nook offers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {venue.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-nook-cream/50 border border-nook-sand"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-nook-olive shadow-sm">
                      {featureIcons[feature] || <Zap size={20} />}
                    </div>
                    <span className="font-medium text-nook-ink">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <section id="reviews">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-serif font-bold text-nook-ink">Reviews</h3>
                <button className="nook-button-secondary flex items-center gap-2">
                  <Plus size={18} />
                  <span>Write a Review</span>
                </button>
              </div>

              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-2xl border border-nook-sand bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-nook-sand rounded-full overflow-hidden">
                          <img
                            src={`https://picsum.photos/seed/user${i}/100/100`}
                            alt="User"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-nook-ink">User {i}</h4>
                          <span className="text-xs text-nook-ink/40">2 days ago</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-nook-olive">
                        {[...Array(5)].map((_, star) => (
                          <Star key={star} size={14} fill={star < 4 ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-nook-ink/70 leading-relaxed">
                      &ldquo;I absolutely love this spot! The atmosphere is perfect for getting work
                      done. The coffee is excellent and the Wi-Fi is super fast. Highly recommend
                      for anyone looking for a quiet place to study.&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            <div className="nook-card p-8 sticky top-20">
              <h4 className="text-xl font-serif font-bold text-nook-ink mb-6">Quick Details</h4>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center justify-between text-sm">
                  <span className="text-nook-ink/40">Price Level</span>
                  <span className="font-bold text-nook-olive">{'$'.repeat(venue.priceLevel)}</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-nook-ink/40">Noise Level</span>
                  <span className="font-bold text-nook-olive">Quiet</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-nook-ink/40">Best For</span>
                  <span className="font-bold text-nook-olive">Deep Work</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-nook-ink/40">Power Outlets</span>
                  <span className="font-bold text-nook-olive">Available</span>
                </li>
              </ul>

              <div className="space-y-3">
                <button className="nook-button-primary w-full py-4 text-lg">
                  Get Directions
                </button>
                <button className="nook-button-secondary w-full py-4 text-lg">
                  Save to Favorites
                </button>
              </div>

              <div className="mt-8 p-4 bg-nook-cream rounded-xl flex items-start gap-3">
                <Info size={18} className="text-nook-olive mt-0.5 shrink-0" />
                <p className="text-xs text-nook-ink/60 leading-relaxed">
                  This location is popular during afternoons. We recommend arriving before 2 PM to
                  secure a good spot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
