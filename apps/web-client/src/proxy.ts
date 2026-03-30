import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ROUTES, PUBLIC_ROUTES, OWNER_PREFIX, ADMIN_PREFIX } from '@/config/routes';

/**
 * Next.js Proxy (Next.js 16) — auth-based route protection.
 * Renamed from middleware.ts → proxy.ts per Next.js 16 convention.
 *
 * Logic:
 * - Public routes: always accessible
 * - Auth routes (login/register): redirect to home if already authenticated
 * - Owner routes: require owner/admin role
 * - Admin routes: require admin role
 * - User routes: require authentication
 */
export default function proxy(request: NextRequest) {
  // ── Dev bypass: skip auth in development ──────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }
  // ──────────────────────────────────────────────────────────────────────

  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;
  // Role is stored in a separate cookie after login (set by auth-provider)
  const role = request.cookies.get('user_role')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  // Auth routes: redirect authenticated users to home
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Public routes: allow all
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected routes: redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: require admin role
  if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Owner routes: require owner or admin role
  if (pathname.startsWith(OWNER_PREFIX) && role !== 'owner' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     * - API routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
