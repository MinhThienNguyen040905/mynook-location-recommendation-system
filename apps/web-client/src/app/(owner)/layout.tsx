/**
 * Owner Layout — dashboard layout for venue owners.
 * Sidebar navigation + top bar. Optimized for desktop/tablet.
 */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* <Sidebar /> — collapsible sidebar with owner nav links */}
      <div className="flex flex-1 flex-col">
        {/* <Topbar /> — with venue selector, notifications, profile */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
