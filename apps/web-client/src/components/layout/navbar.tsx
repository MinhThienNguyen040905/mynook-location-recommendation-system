'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, User, Heart, Menu, X, ChevronDown, LogOut, LayoutDashboard, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { NookLogo } from '@/components/shared/nook-logo';
import { NotificationDropdown } from '@/components/shared/notification-dropdown';
import { ContributeVenueModal } from '@/components/venue/contribute-venue-modal';
import { useAuthStore } from '@/stores/auth-store';
import { logout as logoutApi } from '@/lib/api/auth';

/* ── User avatar dropdown ────────────────────────────────────── */
function UserMenu({ name, avatar, role }: { name: string | null; avatar: string | null; role: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function handleLogout() {
    logoutApi();
    useAuthStore.getState().reset();
    window.location.href = '/';
  }

  const isOwner = role === 'owner';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-nook-sand/60 transition-colors"
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="size-8 rounded-full border-2 border-nook-olive/30 object-cover"
          />
        ) : (
          <div className="size-8 rounded-full border-2 border-nook-olive/30 bg-nook-olive/10 flex items-center justify-center">
            <User size={16} className="text-nook-olive" />
          </div>
        )}
        <span className="text-sm font-medium text-nook-ink hidden sm:block">{name || 'Tài khoản'}</span>
        <ChevronDown size={14} className="text-nook-ink/40" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-nook-sand py-1.5 z-50"
          >
            <Link href="/profile"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-nook-ink/70 hover:bg-nook-cream hover:text-nook-olive transition-colors">
              <User size={15} className="text-nook-olive" /> Thông tin cá nhân
            </Link>
            <Link href="/favorites"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-nook-ink/70 hover:bg-nook-cream hover:text-nook-olive transition-colors">
              <Heart size={15} className="text-nook-olive" /> Yêu thích
            </Link>
            {isOwner && (
              <Link href="/dashboard"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-nook-ink/70 hover:bg-nook-cream hover:text-nook-olive transition-colors">
                <LayoutDashboard size={15} className="text-nook-olive" /> Quản lý quán
              </Link>
            )}
            <hr className="my-1 border-nook-sand" />
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={15} /> Đăng xuất
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Navbar ──────────────────────────────────────────────────── */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pathname = usePathname();

  const isLoggedIn = !isLoading && !!user;
  const userRole = user?.type ?? null;

  /* Nav links — Profile chỉ hiện khi đã đăng nhập */
  const publicLinks = [
    { name: 'Trang chủ', path: '/'       },
    { name: 'Tìm kiếm',  path: '/search' },
  ];

  const authLinks = [
    ...publicLinks,
    { name: 'Yêu thích', path: '/favorites' },
    { name: 'Hồ sơ',     path: '/profile'   },
  ];

  const navLinks = isLoggedIn ? authLinks : publicLinks;

  return (
    <>
    <nav className="sticky top-0 z-50 bg-nook-cream/80 backdrop-blur-md border-b border-nook-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">

          {/* Logo */}
          <Link href="/">
            <NookLogo size="md" iconClassName="rotate-180" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
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
          <div className="hidden md:flex items-center gap-3">
            <button className="p-2 text-nook-ink/60 hover:text-nook-olive transition-colors">
              <Search size={20} />
            </button>

            {isLoggedIn && (
              <button
                onClick={() => setShowContribute(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#e9590c] hover:bg-[#e9590c]/10 rounded-xl transition-colors"
              >
                <Plus size={16} />
                <span>Đóng góp địa điểm</span>
              </button>
            )}

            {isLoggedIn && <NotificationDropdown />}
            {isLoggedIn ? (
              <UserMenu name={user?.full_name ?? null} avatar={user?.avatar_url ?? null} role={userRole} />
            ) : (
              <Link href="/login" className="nook-button-primary flex items-center gap-2">
                <User size={18} />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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
              {isLoggedIn && (
                <button
                  onClick={() => { setIsMenuOpen(false); setShowContribute(true); }}
                  className="w-full px-3 py-4 text-base font-medium rounded-xl text-[#e9590c] hover:bg-[#e9590c]/5 text-left flex items-center gap-2"
                >
                  <Plus size={18} /> Đóng góp địa điểm
                </button>
              )}
              <div className="pt-4">
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      logoutApi();
                      useAuthStore.getState().reset();
                      window.location.href = '/';
                    }}
                    className="w-full nook-button-secondary text-center flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="nook-button-primary text-center block"
                  >
                    Đăng nhập / Đăng ký
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </nav>

    {/* Contribute Venue Modal — rendered outside nav to avoid backdrop-blur stacking context */}
    <AnimatePresence>
      {showContribute && (
        <ContributeVenueModal onClose={() => setShowContribute(false)} />
      )}
    </AnimatePresence>
    </>
  );
}
