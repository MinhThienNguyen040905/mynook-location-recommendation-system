import { VenueManagerTabs } from '@/components/owner/venue-manager-tabs';
import { VenueGeneralInfo } from '@/components/owner/venue-general-info';

/**
 * /dashboard/venue — Tab "General Info" của VenueManager.
 * Server Component: chỉ render tab nav + form content.
 */
export default function VenuePage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-6 pb-32">
      <VenueManagerTabs />
      <VenueGeneralInfo />
    </div>
  );
}
