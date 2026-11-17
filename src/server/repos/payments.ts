/**
 * Akses data pembayaran: percobaan bayar (payment_transactions), log event gateway,
 * dan penerapan status gateway ke order secara atomik dan idempoten.
 */

import { and, asc, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import { HttpError } from '../http';
import type { Db } from '../db';
import {
  orders,
  paymentEvents,
  paymentTransactions,
  refunds,
  type DbPaymentTransaction,
} from '../db/schema';
import { canTransition, deriveOrderPayment, normalizeStatus } from '../payments/decide';
import { parseGrossAmount, type MidtransStatusPayload } from '../payments/midtrans';

export const MAX_PAYMENT_ATTEMPTS = 5;

export type ApplyResultKind =
  | 'applied'
  | 'noop'
  | 'ignored'
  | 'amount_mismatch'
  | 'unknown_order'
  | 'duplicate_payment'
  | 'late_after_cancel';

export interface ApplyResult {
  result: ApplyResultKind;
  orderId?: string;
  /** true hanya untuk pemanggil yang benar-benar memenangkan transisi ke PAID (kirim notifikasi sekali). */
  becamePaid: boolean;
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

async function logEvent(
  tx: Tx | Db,
  p: MidtransStatusPayload,
  source: string,
  result: ApplyResultKind,
  orderId?: string
) {
  await tx.insert(paymentEvents).values({
    midtransOrderId: String(p.order_id),
    orderId: orderId ?? null,
    source,
    transactionStatus: p.transaction_status ?? null,
    fraudStatus: p.fraud_status ?? null,
    statusCode: p.status_code ?? null,
    grossAmount: p.gross_amount ?? null,
    result,
    raw: p,
  });
}

/** Tambahkan kewajiban refund (dibayar ganda / bayar setelah pesanan dibatalkan). */
async function addRefundDue(tx: Tx, orderId: string, amount: number, reason: string) {
  await tx
    .insert(refunds)
    .values({ orderId, status: 'PENDING', amount, reason })
    .onConflictDoUpdate({
      target: refunds.orderId,
      set: {
        status: 'PENDING',
        amount: sql`${refunds.amount} + ${amount}`,
        reason: sql`${refunds.reason} || '; ' || ${reason}`,
      },
    });
}

export async function applyGatewayStatus(
  db: Db,
  payload: MidtransStatusPayload,
  source: 'webhook' | 'status_api' | 'timeout',
  now: number = Date.now()
): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    // Kunci baris agar webhook paralel untuk transaksi yang sama diproses berurutan.
    const [txn] = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.midtransOrderId, payload.order_id))
      .for('update');
    if (!txn) {
      await logEvent(tx, payload, source, 'unknown_order');
      return { result: 'unknown_order', becamePaid: false };
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, txn.orderId)).for('update');

    const gross = parseGrossAmount(payload.gross_amount);
    if (gross === null || gross !== txn.grossAmount || txn.grossAmount !== order.total) {
      await logEvent(tx, payload, source, 'amount_mismatch', order.id);
      return { result: 'amount_mismatch', orderId: order.id, becamePaid: false };
    }

    const next = normalizeStatus(payload);
    if (next === null) {
      await logEvent(tx, payload, source, 'ignored', order.id);
      return { result: 'ignored', orderId: order.id, becamePaid: false };
    }

    let result: ApplyResultKind = 'noop';
    if (canTransition(txn.status as 'PENDING', next)) {
      await tx
        .update(paymentTransactions)
        .set({
          status: next,
          midtransTransactionId: payload.transaction_id ?? txn.midtransTransactionId,
          paymentType: payload.payment_type ?? txn.paymentType,
          lastCheckedAt: new Date(now),
          updatedAt: new Date(now),
        })
        .where(eq(paymentTransactions.id, txn.id));
      result = 'applied';
    }

    const attempts = await tx
      .select({ attempt: paymentTransactions.attempt, status: paymentTransactions.status })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, order.id));
    const derived = deriveOrderPayment(attempts);

    let becamePaid = false;
    if (derived === 'PAID' && order.paymentStatus !== 'PAID') {
      const estimateMs = order.estimate * 60 * 1000;
      const asap = order.mode === 'asap';
      // Atomik: hanya satu pemanggil yang mengubah ke PAID, sehingga notifikasi tidak ganda.
      const won = await tx
        .update(orders)
        .set({
          paymentStatus: 'PAID',
          paidAt: new Date(now),
          notificationStatus: 'QUEUED',
          ...(asap ? { pickupAt: new Date(now + estimateMs) } : {}),
          needsTimeConfirmation: !asap && now + estimateMs > order.pickupAt.getTime(),
        })
        .where(and(eq(orders.id, order.id), ne(orders.paymentStatus, 'PAID')))
        .returning({ id: orders.id });
      becamePaid = won.length > 0;
      if (becamePaid && order.fulfillmentStatus === 'CANCELLED') {
        await addRefundDue(tx, order.id, txn.grossAmount, 'Pembayaran masuk setelah pesanan dibatalkan');
        result = 'late_after_cancel';
      }
    } else if (order.paymentStatus !== 'PAID' && derived !== order.paymentStatus) {
      await tx.update(orders).set({ paymentStatus: derived }).where(eq(orders.id, order.id));
    }

    if (result === 'applied' && next === 'PAID' && order.paymentStatus === 'PAID') {
      await addRefundDue(
        tx,
        order.id,
        txn.grossAmount,
        `Pembayaran ganda (percobaan ${txn.attempt})`
      );
      result = 'duplicate_payment';
    }

    await logEvent(tx, payload, source, result, order.id);
    return { result, orderId: order.id, becamePaid };
  });
}

/** Cadangkan nomor percobaan baru (menahan baris order agar permintaan paralel tidak bentrok). */
export async function reserveAttempt(
  db: Db,
  order: { id: string; number: string; total: number },
  now: number = Date.now()
): Promise<DbPaymentTransaction> {
  return db.transaction(async (tx) => {
    await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, order.id)).for('update');
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${paymentTransactions.attempt}), 0)` })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, order.id));
    const attempt = Number(max) + 1;
    if (attempt > MAX_PAYMENT_ATTEMPTS) {
      throw new HttpError(
        429,
        'Batas percobaan pembayaran tercapai. Silakan hubungi warung untuk bantuan.'
      );
    }
    const [row] = await tx
      .insert(paymentTransactions)
      .values({
        orderId: order.id,
        attempt,
        midtransOrderId: `${order.number}-${attempt}`,
        grossAmount: order.total,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();
    return row;
  });
}

export async function attachSnap(
  db: Db,
  txnId: number,
  orderId: string,
  snap: { token: string; redirectUrl: string; expiresAt: number }
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(paymentTransactions)
      .set({
        snapToken: snap.token,
        redirectUrl: snap.redirectUrl,
        expiresAt: new Date(snap.expiresAt),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txnId));
    await tx.update(orders).set({ snapToken: snap.token }).where(eq(orders.id, orderId));
    // Percobaan baru aktif: order yang sebelumnya gagal/kedaluwarsa kembali menunggu pembayaran.
    await tx
      .update(orders)
      .set({ paymentStatus: 'PENDING' })
      .where(and(eq(orders.id, orderId), inArray(orders.paymentStatus, ['FAILED', 'EXPIRED'])));
  });
}

/** Percobaan gagal dimulai (mis. Midtrans tidak terjangkau): tandai FAILED tanpa menyentuh PAID. */
export async function failAttempt(db: Db, txnId: number, orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(paymentTransactions)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(and(eq(paymentTransactions.id, txnId), eq(paymentTransactions.status, 'PENDING')));
    const attempts = await tx
      .select({ attempt: paymentTransactions.attempt, status: paymentTransactions.status })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, orderId));
    const derived = deriveOrderPayment(attempts);
    await tx
      .update(orders)
      .set({ paymentStatus: derived })
      .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, 'PAID')));
  });
}

/** Percobaan PENDING terbaru yang token Snap-nya masih berlaku (boleh dipakai ulang). */
export async function getLiveAttempt(
  db: Db,
  orderId: string,
  now: number = Date.now()
): Promise<DbPaymentTransaction | null> {
  const [row] = await db
    .select()
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.orderId, orderId), eq(paymentTransactions.status, 'PENDING')))
    .orderBy(desc(paymentTransactions.attempt))
    .limit(1);
  return row && row.snapToken && row.expiresAt && row.expiresAt.getTime() > now ? row : null;
}

export async function listPendingAttempts(
  db: Db,
  orderId: string
): Promise<DbPaymentTransaction[]> {
  return db
    .select()
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.orderId, orderId), eq(paymentTransactions.status, 'PENDING')))
    .orderBy(asc(paymentTransactions.attempt));
}

export async function touchChecked(db: Db, txnId: number, now: number): Promise<void> {
  await db
    .update(paymentTransactions)
    .set({ lastCheckedAt: new Date(now) })
    .where(eq(paymentTransactions.id, txnId));
}

/** Order yang masih punya percobaan PENDING dan sudah cukup lama (untuk rekonsiliasi massal). */
export async function listOrdersWithStalePending(
  db: Db,
  olderThanMs: number,
  limit: number,
  now: number = Date.now()
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ orderId: paymentTransactions.orderId })
    .from(paymentTransactions)
    .where(
      and(
        inArray(paymentTransactions.status, ['PENDING']),
        lt(paymentTransactions.createdAt, new Date(now - olderThanMs))
      )
    )
    .limit(limit);
  return rows.map((r) => r.orderId);
}
