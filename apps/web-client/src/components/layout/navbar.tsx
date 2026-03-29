'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // replaces useLocation from react-router-dom
import { Search, User, Heart, Menu, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname(); // replaces location.pathname

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
    { name: 'Favorites', path: '/favorites' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-nook-cream/80 backdrop-blur-md border-b border-nook-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo — href replaces to */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-nook-olive rounded-xl flex items-center justify-center text-white transition-transform group-hover:rotate-12">
              <MapPin size={24} />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-nook-olive">
              MyNook
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path} // href replaces to
                className={cn(
                  'text-sm font-medium transition-colors hover:text-nook-olive',
                  pathname === link.path ? 'text-nook-olive' : 'text-nook-ink/60'
                )}
              >
                {link.name}
                {pathname === link.path && (
                  <motion.div
                    layoutId="nav-underline"
                    className="h-0.5 bg-nook-olive mt-0.5 rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button className="p-2 text-nook-ink/60 hover:text-nook-olive transition-colors">
              <Search size={20} />
            </button>
            <button className="p-2 text-nook-ink/60 hover:text-nook-olive transition-colors">
              <Heart size={20} />
            </button>
            {/* /auth → /login */}
            <Link href="/login" className="nook-button-primary flex items-center gap-2">
              <User size={18} />
              <span>Login</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-nook-ink/60 hover:text-nook-olive transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-nook-sand overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'block px-3 py-4 text-base font-medium rounded-xl',
                    pathname === link.path
                      ? 'bg-nook-cream text-nook-olive'
                      : 'text-nook-ink/60 hover:bg-nook-cream/50'
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="nook-button-primary text-center"
                >
                  Login / Register
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
