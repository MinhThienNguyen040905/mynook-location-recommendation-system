/**
 * Owner root layout — chỉ scope màu cam cho toàn bộ owner routes.
 * Sidebar/Topbar được đặt ở (manage)/layout.tsx.
 */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-owner">
      {children}
    </div>
  );
}
