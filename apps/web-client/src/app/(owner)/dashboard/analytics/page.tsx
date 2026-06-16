import { Suspense } from 'react';
import { VenueManagerTabs } from '@/components/owner/venue-manager-tabs';
import { VenueAnalytics } from '@/components/owner/venue-analytics';

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-6 pb-32">
      <Suspense fallback={null}>
        <VenueManagerTabs />
        <VenueAnalytics />
      </Suspense>
    </div>
  );
}
