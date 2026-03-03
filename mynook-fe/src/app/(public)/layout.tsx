// src/app/(public)/layout.tsx
import React from "react";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER TỪ HTML CỦA BẠN */}
      <header className="fixed top-0 w-full z-50 glass-nav border-b border-white/20 dark:border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center">
              <Link
                className="font-serif text-3xl font-bold text-primary tracking-tight"
                href="/"
              >
                MyNook
              </Link>
            </div>
            <div className="hidden md:flex space-x-8 items-center">
              <Link
                className="text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary font-medium text-sm transition-colors"
                href="#"
              >
                Home
              </Link>
              <Link
                className="text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary font-medium text-sm transition-colors"
                href="#"
              >
                Explore
              </Link>
              <Link
                className="text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary font-medium text-sm transition-colors"
                href="#"
              >
                Saved
              </Link>
              <Link
                className="text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary font-medium text-sm transition-colors"
                href="#"
              >
                Community
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                className="hidden md:block text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-medium text-sm transition-colors"
                href="#"
              >
                For Owners
              </Link>
              <button className="text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
                <span className="material-icons text-xl">dark_mode</span>
              </button>
              <Link
                className="hidden md:inline-flex items-center justify-center px-5 py-2 border border-primary text-sm font-medium rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                href="#"
              >
                Sign In
              </Link>
              <button className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">
                <span className="material-icons">menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH (Sẽ render app/page.tsx vào đây) */}
      <div className="flex-grow">{children}</div>

      {/* FOOTER TỪ HTML CỦA BẠN */}
      <footer className="bg-white dark:bg-background-dark pt-16 pb-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <span className="font-serif text-2xl font-bold text-primary tracking-tight block mb-4">
                MyNook
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Curating the best local spaces for you to dine, work, and
                connect. Find your place in the city.
              </p>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-bold mb-4">
                Discover
              </h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Dining
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Cafes
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Workspaces
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
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
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
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
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-primary transition-colors"
                    href="#"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-xs">
              © 2023 MyNook Inc. All rights reserved.
            </p>
            <div className="flex space-x-4">
              {/* LƯU Ý: viewBox trong React viết hoa chữ B */}
              <a
                className="text-slate-400 hover:text-primary transition-colors"
                href="#"
              >
                <span className="sr-only">Instagram</span>
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
                </svg>
              </a>
              <a
                className="text-slate-400 hover:text-primary transition-colors"
                href="#"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
