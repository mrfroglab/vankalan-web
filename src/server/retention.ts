/**
 * Kebijakan retensi data (PRD 11.2 & TBD-08). Angka di bawah adalah USULAN default yang dapat
 * diubah lewat env sampai pemilik warung memutuskan:
 *
 * - ORDER_LINK_TTL_DAYS (30)  : tautan privat order kedaluwarsa setelah N hari sejak dibuat,
 *                               kecuali pesanan lunas masih berjalan (tidak pernah putus saat diproses).
 * - PII_RETENTION_DAYS (90)   : nama, nomor WA, dan catatan pelanggan dianonimkan setelah N hari
 *                               untuk pesanan yang sudah selesai/dibatalkan. Total & item tetap
 *                               untuk pembukuan. Pesanan dengan refund belum tuntas tidak dianonimkan.
 * - UNPAID_RETENTION_DAYS (7) : pesanan yang tidak pernah lunas dihapus setelah N hari.
 * - EVENT_RETENTION_DAYS (180): payload mentah log event pembayaran dikosongkan setelah N hari
 *                               (baris audit tetap ada).
 */

import { and, eq, inArray, isNotNull, isNull, lt, ne, notExists, sql } from 'drizzle-orm';
import type { Order } from '@/types';
import type { Db } from './db';
import { orderItems, orders, paymentEvents, refunds } from './db/schema';

export interface RetentionConfig {
  linkTtlDays: number;
  piiDays: number;
  unpaidDays: number;
  eventDays: number;
}

function days(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export function getRetentionConfig(): RetentionConfig {
  return {
    linkTtlDays: days('ORDER_LINK_TTL_DAYS', 30),
    piiDays: days('PII_RETENTION_DAYS', 90),
    unpaidDays: days('UNPAID_RETENTION_DAYS', 7),
    eventDays: days('EVENT_RETENTION_DAYS', 180),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_FULFILLMENT: Order['fulfillment'][] = ['NEW', 'PREPARING', 'READY'];

/** Pesanan lunas yang masih berjalan tidak pernah kehilangan tautannya. */
export function isOrderLinkExpired(
  order: Pick<Order, 'created' | 'payment' | 'fulfillment'>,
  now: number = Date.now(),
  cfg: RetentionConfig = getRetentionConfig()
): boolean {
  if (order.payment === 'PAID' && OPEN_FULFILLMENT.includes(order.fulfillment)) return false;
  return now > order.created + cfg.linkTtlDays * DAY_MS;
}

export const REDACTED_NAME = 'Pelanggan (data dihapus)';
export const REDACTED_PHONE = '-';

export interface PurgeSummary {
  deletedUnpaid: number;
  redacted: number;
  eventsPruned: number;
}

/** Jalankan semua aturan retensi. Idempoten: aman dipanggil berulang. */
export async function purgeExpiredData(
  db: Db,
  now: number = Date.now(),
  cfg: RetentionConfig = getRetentionConfig()
): Promise<PurgeSummary> {
  const cutoff = (d: number) => new Date(now - d * DAY_MS);

  return db.transaction(async (tx) => {
    // 1. Pesanan yang tidak pernah lunas dan tanpa catatan refund -> hapus (cascade item/transaksi/tugas).
    const deleted = await tx
      .delete(orders)
      .where(
        and(
          ne(orders.paymentStatus, 'PAID'),
          lt(orders.createdAt, cutoff(cfg.unpaidDays)),
          notExists(tx.select({ x: sql`1` }).from(refunds).where(eq(refunds.orderId, orders.id)))
        )
      )
      .returning({ id: orders.id });

    // 2. Anonimkan data pribadi pesanan selesai/batal yang sudah melewati masa simpan,
    //    kecuali refund-nya belum tuntas (kontak pelanggan masih dibutuhkan).
    const redactedRows = await tx
      .update(orders)
      .set({ name: REDACTED_NAME, phone: REDACTED_PHONE, note: null, piiRedactedAt: new Date(now) })
      .where(
        and(
          isNull(orders.piiRedactedAt),
          lt(orders.createdAt, cutoff(cfg.piiDays)),
          inArray(orders.fulfillmentStatus, ['COMPLETED', 'CANCELLED']),
          notExists(
            tx
              .select({ x: sql`1` })
              .from(refunds)
              .where(
                and(eq(refunds.orderId, orders.id), inArray(refunds.status, ['PENDING', 'PARTIAL_REFUNDED']))
              )
          )
        )
      )
      .returning({ id: orders.id });
    if (redactedRows.length > 0) {
      await tx
        .update(orderItems)
        .set({ note: null })
        .where(
          and(
            inArray(orderItems.orderId, redactedRows.map((r) => r.id)),
            isNotNull(orderItems.note)
          )
        );
    }

    // 3. Kosongkan payload mentah log pembayaran yang sudah lama (baris audit tetap).
    const pruned = await tx
      .update(paymentEvents)
      .set({ raw: null })
      .where(and(lt(paymentEvents.createdAt, cutoff(cfg.eventDays)), isNotNull(paymentEvents.raw)))
      .returning({ id: paymentEvents.id });

    return {
      deletedUnpaid: deleted.length,
      redacted: redactedRows.length,
      eventsPruned: pruned.length,
    };
  });
}
