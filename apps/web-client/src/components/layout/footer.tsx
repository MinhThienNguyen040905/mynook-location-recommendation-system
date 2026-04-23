import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#221610] pt-16 pb-8 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <span className="font-serif text-2xl font-bold text-[#e9590c] tracking-tight block mb-1">
              MyNook
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
              Curating the best local spaces for you to dine, work, and connect.
              Find your place in the city.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 shrink-0 pr-32.5">
            <Link href="#" className="hover:text-[#e9590c] transition-colors">About Us</Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link href="#" className="hover:text-[#e9590c] transition-colors">Privacy Policy</Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link href="#" className="hover:text-[#e9590c] transition-colors">Terms of Service</Link>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <p className="text-slate-400 text-xs">
            © 2026 MyNook Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
