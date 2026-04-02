// components/venue-detail/venue-amenities.tsx
import { Wifi, Plug, Snowflake, Volume2, Armchair } from "lucide-react";

const AMENITIES = [
  { icon: Wifi, title: "Fast Wifi", desc: "100+ Mbps" },
  { icon: Plug, title: "Power Plugs", desc: "Plenty available" },
  { icon: Snowflake, title: "Climate", desc: "AC Cool" },
  { icon: Volume2, title: "Noise Level", desc: "Moderate focus" },
  { icon: Armchair, title: "Seating", desc: "Ergonomic" },
];

export function VenueAmenities() {
  return (
    <section>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Amenities
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {AMENITIES.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-[#e9590c]/10 flex items-center justify-center text-[#e9590c]">
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
