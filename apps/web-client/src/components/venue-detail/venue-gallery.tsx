"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Images, X } from "lucide-react";

interface VenueGalleryProps {
  media: string[];
  name: string;
}

export function VenueGallery({ media, name }: VenueGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : media[activeIndex];

  const openImage = (index: number) => setActiveIndex(index);
  const closeImage = () => setActiveIndex(null);
  const showPrevious = () => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return current === 0 ? media.length - 1 : current - 1;
    });
  };
  const showNext = () => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return current === media.length - 1 ? 0 : current + 1;
    });
  };

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImage();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, media.length]);

  if (!media || media.length === 0) {
    return (
      <div className="h-[300px] mb-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
        <ImageIcon size={48} className="mb-2" />
        <p className="text-sm">Chưa có ảnh</p>
      </div>
    );
  }

  const lightbox = activeImage && (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={closeImage}
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh của ${name}`}
    >
      <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
        {(activeIndex ?? 0) + 1} / {media.length}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          closeImage();
        }}
        className="absolute right-4 top-4 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
        aria-label="Đóng thư viện ảnh"
      >
        <X size={22} />
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
            aria-label="Ảnh tiếp theo"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <img
        src={activeImage}
        alt={`${name} photo ${(activeIndex ?? 0) + 1}`}
        className="max-h-[88vh] max-w-[92vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );

  // 1 image: full width
  if (media.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => openImage(0)}
          className="block w-full h-[400px] mb-12 rounded-2xl overflow-hidden text-left"
        >
          <img
            src={media[0]}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        </button>
        {lightbox}
      </>
    );
  }

  // 2-4 images: main + side column
  if (media.length <= 4) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px] mb-12">
          <button
            type="button"
            onClick={() => openImage(0)}
            className="md:col-span-2 relative group overflow-hidden rounded-2xl cursor-pointer text-left"
          >
            <img
              src={media[0]}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </button>
          <div className="flex flex-col gap-4">
            {media.slice(1).map((url, i) => (
              <button
                type="button"
                key={url}
                onClick={() => openImage(i + 1)}
                className="relative group overflow-hidden rounded-2xl cursor-pointer flex-1 text-left"
              >
                <img
                  src={url}
                  alt={`${name} photo ${i + 2}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
        {lightbox}
      </>
    );
  }

  // 5+ images: masonry grid (main 2x2 + 4 thumbnails)
  const extraCount = media.length - 5;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12">
        {/* Main Large Image */}
        <button
          type="button"
          onClick={() => openImage(0)}
          className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-2xl cursor-pointer text-left"
        >
          <img
            src={media[0]}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </button>

        {media.slice(1, 5).map((url, i) => (
          <button
            type="button"
            key={url}
            onClick={() => openImage(i + 1)}
            className="relative group overflow-hidden rounded-2xl cursor-pointer text-left"
          >
            <img
              src={url}
              alt={`${name} photo ${i + 2}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* "See more" overlay on last thumbnail if there are more photos */}
            {i === 3 && extraCount > 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors">
                <span className="inline-flex items-center gap-2 text-white font-bold text-lg">
                  <Images size={20} />
                  +{extraCount} Photos
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
