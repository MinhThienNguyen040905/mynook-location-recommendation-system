import Link from 'next/link';

export function Navbar() {
  return (
    <header className="border-b">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          MyNook
        </Link>
        <div className="flex items-center gap-4">
          {/* TODO: Search bar, auth buttons, user menu */}
        </div>
      </nav>
    </header>
  );
}
