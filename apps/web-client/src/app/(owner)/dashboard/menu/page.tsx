import { VenueManagerTabs } from '@/components/owner/venue-manager-tabs';
import { MenuManagement } from '@/components/owner/menu-management';

/**
 * /dashboard/menu — Tab "Menu Management" của VenueManager.
 * Server Component: chỉ render tab nav + menu content.
 */
export default function MenuPage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-6 pb-32">
      <VenueManagerTabs />
      <MenuManagement />
    </div>
  );
}
