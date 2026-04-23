import { Navbar } from '@/components/layout/navbar';

/**
 * User Layout — for authenticated user pages (profile, bookings, favorites).
 */
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-nook-cream/30">{children}</main>
    </>
  );
}
