/**
 * Public Layout — used by home, search, venue detail.
 * Includes the main header (logo, search, auth) and footer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Header /> */}
      <main className="min-h-screen">{children}</main>
      {/* <Footer /> */}
      {/* <MobileNav /> — sticky bottom nav for mobile */}
    </>
  );
}
