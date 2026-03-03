import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TODO: Implement route protection and role-based access control
  // - Check JWT token from cookies
  // - Redirect unauthenticated users from protected routes
  // - Redirect unauthorized users from admin/owner routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};
