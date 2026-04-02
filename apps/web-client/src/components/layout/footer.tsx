import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#221610] pt-16 pb-8 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <span className="font-serif text-2xl font-bold text-[#e9590c] tracking-tight block mb-4">
              MyNook
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Curating the best local spaces for you to dine, work, and connect.
              Find your place in the city.
            </p>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">
              Discover
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Dining
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Cafes
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Workspaces
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Trending
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">
              Legal
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#e9590c] transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            © 2026 MyNook Inc. All rights reserved.
          </p>
          {/* Social Icons có thể đặt ở đây */}
        </div>
      </div>
    </footer>
  );
}
