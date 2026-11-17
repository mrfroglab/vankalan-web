/**
 * Logika murni serah terima sif (PRD 5.5 & 13): daftar pesanan lunas yang belum selesai, siapa
 * yang terakhir diberi tahu, dan pengiriman ulang EKSPLISIT ke penjaga pengganti.
 */

import type { Order } from '@/types';

const OPEN_FULFILLMENT: Order['fulfillment'][] = ['NEW', 'PREPARING', 'READY'];

/** Pesanan lunas yang belum selesai/dibatalkan; urut dari waktu ambil terdekat. */
export function openPaidOrders(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.payment === 'PAID' && OPEN_FULFILLMENT.includes(o.fulfillment))
    .sort((a, b) => a.pickup - b.pickup);
}

/**
 * Perlu dikirim ke sif aktif bila penerima terakhirnya penjaga lain, atau notifikasi ke penerima
 * terakhir belum terkonfirmasi terkirim (gagal / hasil tak pasti).
 */
export function needsHandover(order: Order, activeShiftId: string): boolean {
  if (order.recipientShiftId !== activeShiftId) return true;
  return order.notification !== 'SENT';
}

export interface HandoverSummary {
  total: number;
  sent: number;
  /** Hasil tak pasti atau belum terkirim; penjaga perlu memeriksa. */
  unresolved: { orderId: string; number: string; reason: string }[];
}

/**
 * Kirim ulang ke sif aktif untuk tiap pesanan terpilih, berurutan agar tidak membanjiri WAHA.
 * `resend` dilempar oleh pemanggil (orderService.retryWhatsApp); satu kegagalan tidak menghentikan yang lain.
 */
export async function runHandover(
  orders: Order[],
  resend: (orderId: string) => Promise<Order>
): Promise<HandoverSummary> {
  const summary: HandoverSummary = { total: orders.length, sent: 0, unresolved: [] };
  for (const order of orders) {
    try {
      const updated = await resend(order.id);
      if (updated.notification === 'SENT') {
        summary.sent++;
      } else {
        summary.unresolved.push({
          orderId: order.id,
          number: order.number,
          reason:
            updated.notification === 'UNKNOWN'
              ? 'Hasil pengiriman belum pasti; cek WhatsApp.'
              : updated.notificationDetail?.lastError ?? 'Belum terkirim.',
        });
      }
    } catch (err) {
      summary.unresolved.push({
        orderId: order.id,
        number: order.number,
        reason: err instanceof Error ? err.message : 'Gagal mengirim.',
      });
    }
  }
  return summary;
}
