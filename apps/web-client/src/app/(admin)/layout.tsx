/**
 * Admin Layout — dashboard layout for system administrators.
 * Similar to owner layout with admin-specific sidebar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar /> — admin navigation */}
      <div className="flex flex-1 flex-col">
        {/* <AdminTopbar /> — with system alerts, profile */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
