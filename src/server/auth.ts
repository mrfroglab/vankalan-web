/**
 * Penjaga akses endpoint admin.
 *
 * STATUS: placeholder sampai autentikasi admin sungguhan dibuat (langkah berikutnya).
 * - Non-production: diizinkan agar UI admin bisa dikembangkan.
 * - Production: SELALU ditolak (503) sampai auth diimplementasikan, supaya endpoint
 *   tulis tidak pernah terbuka ke publik tanpa sengaja.
 *
 * Semua route admin memanggil requireAdmin(); saat auth siap, cukup ganti isi fungsi ini.
 */

import { HttpError } from './http';

export function requireAdmin(request: Request): void {
  void request; // dipakai saat auth sungguhan (cookie/header) diimplementasikan
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(
      503,
      'Autentikasi admin belum dikonfigurasi; endpoint admin dinonaktifkan di production.'
    );
  }
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
