import { getAllVenuesServer } from "@/lib/api/venues";
import { AllVenuesPaginated } from "./all-venues-paginated";

export async function AllVenuesSection() {
  const venues = await getAllVenuesServer();

  if (venues.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Tất cả địa điểm
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Khám phá những địa điểm nổi bật trong cộng đồng MyNook.
        </p>
      </div>

      <AllVenuesPaginated venues={venues} />
    </section>
  );
}
