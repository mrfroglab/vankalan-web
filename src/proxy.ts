/**
 * Pemeriksaan optimistik untuk halaman /admin/*: arahkan ke /admin/login bila belum
 * punya sesi. Ini BUKAN otorisasi; setiap route /api admin tetap memanggil requireAdmin().
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, isAuthConfigured, verifySessionToken } from '@/server/session';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();

  // Dev lokal tanpa konfigurasi auth: biarkan terbuka. Production: fail closed.
  if (!isAuthConfigured() && process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  if (isAuthConfigured() && verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/admin/:path*',
};
