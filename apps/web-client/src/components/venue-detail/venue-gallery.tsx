"use client";

const IMAGES = [
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1481833758786-ceed143f8c87?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=500",
];

export function VenueGallery() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12">
      {/* Main Large Image */}
      <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={IMAGES[0]}
          alt="Main Hall"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <span className="text-white font-medium">Main Hall</span>
        </div>
      </div>

      {/* Top Right 1 */}
      <div className="relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={IMAGES[1]}
          alt="Cozy table setting"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Top Right 2 */}
      <div className="relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={IMAGES[2]}
          alt="Artisan latte"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Bottom Right 1 */}
      <div className="relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={IMAGES[3]}
          alt="Pastries"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Bottom Right 2 (See All) */}
      <div className="relative group overflow-hidden rounded-2xl cursor-pointer">
        <img
          src={IMAGES[4]}
          alt="Exterior"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors">
          <span className="text-white font-bold text-lg">+12 Photos</span>
        </div>
      </div>
    </div>
  );
}
