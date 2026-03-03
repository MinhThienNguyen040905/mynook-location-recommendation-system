import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-gray-50 p-4 dark:bg-gray-900">
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-lg font-bold mb-4">
          MyNook
        </Link>
        {/* TODO: Sidebar navigation items */}
      </nav>
    </aside>
  );
}
