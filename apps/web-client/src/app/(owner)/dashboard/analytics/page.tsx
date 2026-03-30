import { VenueManagerTabs } from '@/components/owner/venue-manager-tabs';
import { BarChart3 } from 'lucide-react';

/**
 * /dashboard/analytics — Tab "Venue Analysis" của VenueManager.
 * Placeholder — sẽ tích hợp chart thật ở phase sau.
 */
export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-6 pb-32">
      <VenueManagerTabs />
      <div className="p-6 bg-white rounded-xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
          <BarChart3 className="text-primary size-5" /> Venue Analysis
        </h3>
        <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium italic">Analytics Chart — Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
