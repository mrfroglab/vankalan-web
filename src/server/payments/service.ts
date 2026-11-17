/**
 * Orkestrasi pembayaran: mulai Snap, terapkan status gateway (webhook/rekonsiliasi),
 * dan kirim notifikasi dapur tepat sekali saat order berubah menjadi PAID.
 */

import type { Db } from '../db';
import type { Order } from '@/types';
import { HttpError } from '../http';
import { notifyKitchen } from '../orders/notify';
import { getOrderById } from '../repos/orders';
import {
  applyGatewayStatus,
  attachSnap,
  failAttempt,
  getLiveAttempt,
  listOrdersWithStalePending,
  listPendingAttempts,
  reserveAttempt,
  touchChecked,
  type ApplyResult,
} from '../repos/payments';
import {
  createSnapTransaction,
  fetchTransactionStatus,
  type MidtransConfig,
  type MidtransStatusPayload,
} from './midtrans';

/** Setelah kedaluwarsa, beri jeda sebelum menandai EXPIRED lokal bila Midtrans tak mengenal transaksi. */
const EXPIRY_GRACE_MS = 60 * 1000;

export interface PaymentStart {
  snapToken: string;
  redirectUrl: string;
}

export async function startPayment(
  db: Db,
  cfg: MidtransConfig,
  order: Order,
  opts: { appUrl?: string; now?: number } = {}
): Promise<PaymentStart> {
  const now = opts.now ?? Date.now();
  const live = await getLiveAttempt(db, order.id, now);
  if (live) return { snapToken: live.snapToken!, redirectUrl: live.redirectUrl! };

  const txn = await reserveAttempt(db, order, now);
  try {
    const snap = await createSnapTransaction(cfg, {
      midtransOrderId: txn.midtransOrderId,
      amount: order.total,
      customerName: order.name,
      customerPhone: order.phone,
      items: order.items,
      finishUrl: opts.appUrl ? `${opts.appUrl.replace(/\/+$/, '')}/order/${order.token}` : undefined,
      expiryMinutes: cfg.expiryMinutes,
    });
    await attachSnap(db, txn.id, order.id, {
      token: snap.token,
      redirectUrl: snap.redirectUrl,
      expiresAt: now + cfg.expiryMinutes * 60 * 1000,
    });
    return { snapToken: snap.token, redirectUrl: snap.redirectUrl };
  } catch (err) {
    await failAttempt(db, txn.id, order.id);
    throw err;
  }
}

/** Terapkan status gateway; bila order baru lunas, kirim notifikasi dapur sekali. */
export async function applyAndNotify(
  db: Db,
  payload: MidtransStatusPayload,
  source: 'webhook' | 'status_api' | 'timeout',
  now?: number
): Promise<ApplyResult> {
  const result = await applyGatewayStatus(db, payload, source, now);
  if (result.becamePaid && result.orderId) {
    try {
      await notifyKitchen(db, result.orderId);
    } catch (err) {
      // Pembayaran sudah tercatat; kegagalan WA tidak boleh membatalkan webhook (bisa dikirim ulang manual).
      console.error('[payments] Notifikasi dapur gagal:', err);
    }
  }
  return result;
}

/**
 * Cek status resmi ke Midtrans untuk percobaan PENDING milik satu order.
 * minIntervalMs membatasi frekuensi (dipakai saat pelanggan polling).
 */
export async function reconcileOrder(
  db: Db,
  cfg: MidtransConfig,
  orderId: string,
  opts: { now?: number; minIntervalMs?: number } = {}
): Promise<ApplyResult[]> {
  const now = opts.now ?? Date.now();
  const results: ApplyResult[] = [];
  for (const txn of await listPendingAttempts(db, orderId)) {
    if (
      opts.minIntervalMs &&
      txn.lastCheckedAt &&
      now - txn.lastCheckedAt.getTime() < opts.minIntervalMs
    ) {
      continue;
    }
    await touchChecked(db, txn.id, now);
    try {
      const status = await fetchTransactionStatus(cfg, txn.midtransOrderId);
      if (status) {
        results.push(await applyAndNotify(db, status, 'status_api', now));
      } else if (txn.expiresAt && now > txn.expiresAt.getTime() + EXPIRY_GRACE_MS) {
        // Pelanggan tidak pernah memilih metode bayar sampai batas waktu habis.
        results.push(
          await applyAndNotify(
            db,
            {
              order_id: txn.midtransOrderId,
              status_code: '202',
              gross_amount: `${txn.grossAmount}.00`,
              transaction_status: 'expire',
            },
            'timeout',
            now
          )
        );
      }
    } catch (err) {
      console.warn(`[payments] Rekonsiliasi ${txn.midtransOrderId} gagal:`, err);
    }
  }
  return results;
}

export interface ReconcileSummary {
  checked: number;
  applied: number;
  paid: number;
}

/** Rekonsiliasi massal order dengan pembayaran PENDING yang sudah cukup lama. */
export async function reconcilePending(
  db: Db,
  cfg: MidtransConfig,
  opts: { olderThanMs?: number; limit?: number; now?: number } = {}
): Promise<ReconcileSummary> {
  const now = opts.now ?? Date.now();
  const ids = await listOrdersWithStalePending(db, opts.olderThanMs ?? 60_000, opts.limit ?? 50, now);
  const summary: ReconcileSummary = { checked: ids.length, applied: 0, paid: 0 };
  for (const id of ids) {
    for (const r of await reconcileOrder(db, cfg, id, { now })) {
      if (r.result === 'applied' || r.result === 'duplicate_payment' || r.result === 'late_after_cancel') {
        summary.applied++;
      }
      if (r.becamePaid) summary.paid++;
    }
  }
  return summary;
}

/** Mulai/lanjutkan pembayaran untuk order yang belum lunas (dipakai tombol "bayar ulang"). */
export async function resumePayment(
  db: Db,
  cfg: MidtransConfig,
  orderId: string,
  opts: { appUrl?: string; now?: number } = {}
): Promise<PaymentStart> {
  const now = opts.now ?? Date.now();
  // Cek dulu percobaan lama agar tidak menagih order yang sebenarnya sudah lunas.
  await reconcileOrder(db, cfg, orderId, { now });
  const order = await getOrderById(db, orderId);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  if (order.payment === 'PAID') throw new HttpError(409, 'Pesanan ini sudah lunas.');
  if (order.fulfillment === 'CANCELLED') {
    throw new HttpError(409, 'Pesanan sudah dibatalkan dan tidak bisa dibayar.');
  }
  return startPayment(db, cfg, order, { appUrl: opts.appUrl, now });
}
