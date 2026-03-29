import { VenueManagerTabs } from '@/components/owner/venue-manager-tabs';
import { SpecialOffers } from '@/components/owner/special-offers';

/**
 * /dashboard/offers — Tab "Special Offers" của VenueManager.
 * Server Component: chỉ render tab nav + offers content.
 */
export default function OffersPage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-6 pb-32">
      <VenueManagerTabs />
      <SpecialOffers />
    </div>
  );
}
