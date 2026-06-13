import { Navbar } from '@/components/layout/navbar';

/**
 * Public Layout — Search & Venue Detail pages.
 * Renders the sticky Navbar above the page content.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-5rem)]">{children}</main>
    </>
  );
}
