/**
 * Keputusan murni: memetakan status Midtrans ke status internal dan aturan transisi.
 * Prinsip (PRD 14.2): PAID hanya dari status sukses terverifikasi; webhook berulang,
 * terlambat, atau tidak berurutan tidak boleh menurunkan status atau mengulang efek samping.
 */

import type { MidtransStatusPayload } from './midtrans';

export type PaymentOutcome = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

/** null = abaikan (refund/chargeback dicatat saja; refund ditangani manual sesuai PRD). */
export function normalizeStatus(
  p: Pick<MidtransStatusPayload, 'transaction_status' | 'fraud_status'>
): PaymentOutcome | null {
  const fraud = p.fraud_status;
  switch (p.transaction_status) {
    case 'settlement':
      return 'PAID';
    case 'capture':
      // capture sukses hanya bila fraud_status accept (atau tidak ada); challenge menunggu review.
      if (fraud === undefined || fraud === 'accept') return 'PAID';
      if (fraud === 'challenge') return 'PENDING';
      return 'FAILED';
    case 'pending':
    case 'authorize':
      return 'PENDING';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'FAILED';
    case 'expire':
      return 'EXPIRED';
    default:
      return null;
  }
}

/** Apakah status transaksi boleh berubah dari `current` ke `next`. */
export function canTransition(current: PaymentOutcome, next: PaymentOutcome): boolean {
  if (current === next) return false;
  if (current === 'PAID') return false; // PAID final
  if (next === 'PAID') return true; // settlement terlambat tetap sah
  if (next === 'PENDING') return false; // PENDING tidak boleh menimpa status lain
  return current === 'PENDING'; // FAILED/EXPIRED hanya dari PENDING; yang pertama menang
}

/** Status pembayaran order dari seluruh percobaan: PAID > PENDING > percobaan terbaru. */
export function deriveOrderPayment(
  attempts: { attempt: number; status: string }[]
): PaymentOutcome {
  if (attempts.some((a) => a.status === 'PAID')) return 'PAID';
  if (attempts.some((a) => a.status === 'PENDING')) return 'PENDING';
  const latest = [...attempts].sort((a, b) => b.attempt - a.attempt)[0];
  return (latest?.status as PaymentOutcome) ?? 'PENDING';
}
