/**
 * Penjaga akses endpoint admin.
 *
 * - Auth terkonfigurasi (ADMIN_PASSWORD + SESSION_SECRET): wajib cookie sesi valid, jika
 *   tidak 401. Permintaan yang mengubah data juga harus berasal dari origin yang sama.
 * - Belum terkonfigurasi: non-production diizinkan (pengembangan lokal); production
 *   ditolak 503 (fail closed) agar endpoint tulis tidak pernah terbuka tanpa sengaja.
 */

import { HttpError } from './http';
import { SESSION_COOKIE, isAuthConfigured, readCookie, verifySessionToken } from './session';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return; // klien non-browser; cookie SameSite=Strict sudah melindungi browser
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origin permintaan tidak valid.');
  }
  if (host && originHost !== host) {
    throw new HttpError(403, 'Permintaan lintas-origin ditolak.');
  }
}

export function requireAdmin(request: Request): void {
  if (!isAuthConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(
        503,
        'Autentikasi admin belum dikonfigurasi (ADMIN_PASSWORD dan SESSION_SECRET); endpoint admin dinonaktifkan.'
      );
    }
    return;
  }
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (!verifySessionToken(token)) {
    throw new HttpError(401, 'Sesi admin tidak valid atau sudah berakhir. Silakan masuk kembali.');
  }
  assertSameOrigin(request);
}

/**
 * Simulasi pembayaran dari klien (tanpa webhook Midtrans) hanya boleh di lingkungan
 * dev/sandbox dan harus di-opt-in. PRD: status PAID hanya dari verifikasi server.
 */
export function assertPaymentSimulationAllowed(): void {
  const allowed =
    process.env.ALLOW_PAYMENT_SIMULATION === 'true' &&
    process.env.MIDTRANS_IS_PRODUCTION !== 'true' &&
    process.env.NODE_ENV !== 'production';
  if (!allowed) {
    throw new HttpError(
      403,
      'Perubahan status pembayaran manual dinonaktifkan. Status PAID hanya dari verifikasi gateway.'
    );
  }
}

/** Endpoint destruktif/demo (seed, reset) hanya untuk non-production. */
export function assertDevOnly(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(403, 'Endpoint ini dinonaktifkan di production.');
  }
}

/** true bila permintaan membawa sesi admin yang sah (tanpa melempar error). */
export function isAdminRequest(request: Request): boolean {
  try {
    requireAdmin(request);
    return true;
  } catch {
    return false;
  }
}
