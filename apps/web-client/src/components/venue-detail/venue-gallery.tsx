"use client";

import { ImageIcon } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=1000";

interface VenueGalleryProps {
  media: string[];
  name: string;
}

export function VenueGallery({ media, name }: VenueGalleryProps) {
  if (!media || media.length === 0) {
    return (
      <div className="h-[300px] mb-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
        <ImageIcon size={48} className="mb-2" />
        <p className="text-sm">No photos available</p>
      </div>
    );
  }

  // 1 image: full width
  if (media.length === 1) {
    return (
      <div className="h-[400px] mb-12 rounded-2xl overflow-hidden">
        <img
          src={media[0]}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 2-4 images: main + side column
  if (media.length <= 4) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px] mb-12">
        <div className="md:col-span-2 relative group overflow-hidden rounded-2xl cursor-pointer">
          <img
            src={media[0]}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col gap-4">
          {media.slice(1).map((url, i) => (
            <div key={i} className="relative group overflow-hidden rounded-2xl cursor-pointer flex-1">
              <img
                src={url}
                alt={`${name} photo ${i + 2}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5+ images: masonry grid (main 2x2 + 4 thumbnails)
  const extraCount = media.length - 5;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12">
      {/* Main Large Image */}
      <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={media[0]}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {media.slice(1, 5).map((url, i) => (
        <div key={i} className="relative group overflow-hidden rounded-2xl cursor-pointer">
          <img
            src={url}
            alt={`${name} photo ${i + 2}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* "See more" overlay on last thumbnail if there are more photos */}
          {i === 3 && extraCount > 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors">
              <span className="text-white font-bold text-lg">+{extraCount} Photos</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
