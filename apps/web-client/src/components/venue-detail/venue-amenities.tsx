import { CheckCircle } from "lucide-react";

interface VenueAmenitiesProps {
  amenities: string[];
}

export function VenueAmenities({ amenities }: VenueAmenitiesProps) {
  return (
    <section>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Amenities
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {amenities.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-[#e9590c]/10 flex items-center justify-center text-[#e9590c] shrink-0">
              <CheckCircle size={16} />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
