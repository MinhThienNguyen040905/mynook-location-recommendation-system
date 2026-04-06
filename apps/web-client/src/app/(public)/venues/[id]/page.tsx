import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { VenueHeader } from "@/components/venue-detail/venue-header";
import { VenueGallery } from "@/components/venue-detail/venue-gallery";
import { VenueAmenities } from "@/components/venue-detail/venue-amenities";
import { VenueLocationMap } from "@/components/venue-detail/venue-location-map";
import { BookingCard } from "@/components/venue-detail/booking-card";
import { VenueReviews } from "@/components/venue-detail/venue-reviews";
import { getVenueByIdServer } from "@/lib/api/venues";
import { getVenueReviewsServer } from "@/lib/api/reviews";

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [venue, reviews] = await Promise.all([
    getVenueByIdServer(id),
    getVenueReviewsServer(id),
  ]);

  if (!venue) return notFound();

  return (
    <div className="bg-[#f8f6f5] dark:bg-[#221610] min-h-screen flex flex-col font-sans">
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <VenueHeader venue={venue} />
        <VenueGallery media={venue.media} name={venue.name} />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Left Column: Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* About Section */}
            {venue.description && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  About this space
                </h2>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {venue.description}
                </p>
              </section>
            )}

            {/* Venue Info */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Space Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Capacity</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{venue.total_capacity}</p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Max Group Size</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{venue.max_group_size}</p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Group Friendly</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{venue.is_group_friendly ? "Yes" : "No"}</p>
                </div>
              </div>
            </section>

            {/* Amenities */}
            {venue.owner_amenities && venue.owner_amenities.length > 0 && (
              <VenueAmenities amenities={venue.owner_amenities} />
            )}

            {/* Opening Hours */}
            {venue.opening_hours && Object.keys(venue.opening_hours).length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Opening Hours
                </h3>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-2">
                  {Object.entries(venue.opening_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{day}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {hours.open} – {hours.close}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Location Map */}
            <VenueLocationMap
              name={venue.name}
              address={`${venue.address}${venue.district ? `, ${venue.district}` : ""}, ${venue.city}`}
              lat={venue.latitude}
              lng={venue.longitude}
            />

            {/* Reviews */}
            <VenueReviews
              venueId={venue.id}
              venueName={venue.name}
              initialReviews={reviews}
            />
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="lg:col-span-1">
            <BookingCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
