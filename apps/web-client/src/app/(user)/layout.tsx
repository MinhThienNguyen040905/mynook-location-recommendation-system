/**
 * User Layout — for authenticated user pages (profile, bookings, favorites).
 * Same header as public but with user-specific navigation.
 */
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Header /> — with user avatar dropdown */}
      <main className="min-h-screen">{children}</main>
      {/* <Footer /> */}
      {/* <MobileNav /> — with user-specific tabs */}
    </>
  );
}
