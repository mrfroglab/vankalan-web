/** Akses data order: pembuatan atomik, transisi status, pembatalan, dan refund. */

import { randomBytes, randomUUID } from 'node:crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  CreateOrderPayload,
  Order,
  OrderFulfillmentStatus,
  OrderItem,
  RefundRecord,
} from '@/types';
import { HttpError } from '../http';
import type { Db } from '../db';
import {
  orderCounters,
  orderItems,
  orders,
  refunds,
  type DbOrder,
  type DbOrderItem,
  type DbRefund,
} from '../db/schema';
import { priceItems, assertPriceMatches, resolvePickup, wibDayKey } from '../orders/pricing';
import { getSettings, listMenu, listShifts } from './settings';

const ms = (d: Date | null | undefined) => (d ? d.getTime() : undefined);

function toOrder(o: DbOrder, items: DbOrderItem[], refund?: DbRefund): Order {
  return {
    id: o.id,
    token: o.token,
    number: o.number,
    created: o.createdAt.getTime(),
    pickup: o.pickupAt.getTime(),
    estimate: o.estimate,
    mode: o.mode,
    name: o.name,
    phone: o.phone,
    ...(o.note ? { note: o.note } : {}),
    payment: o.paymentStatus as Order['payment'],
    fulfillment: o.fulfillmentStatus as Order['fulfillment'],
    notification: o.notificationStatus as Order['notification'],
    recipientShiftId: o.recipientShiftId,
    items: items
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        ...(i.egg ? { egg: true } : {}),
        ...(i.temp ? { temp: i.temp } : {}),
        ...(i.note ? { note: i.note } : {}),
      })),
    total: o.total,
    ...(o.paidAt ? { paidAt: ms(o.paidAt) } : {}),
    ...(o.cancelReason ? { cancelReason: o.cancelReason } : {}),
    ...(refund
      ? {
          refund: {
            status: refund.status as RefundRecord['status'],
            amount: refund.amount,
            reason: refund.reason,
            ...(refund.confirmedAt ? { confirmedAt: ms(refund.confirmedAt) } : {}),
          },
        }
      : {}),
    attempts: o.attempts,
    ...(o.completedAt ? { completedAt: ms(o.completedAt) } : {}),
    ...(o.snapToken ? { snapToken: o.snapToken } : {}),
    ...(o.needsTimeConfirmation ? { needsTimeConfirmation: true } : {}),
  };
}

async function hydrate(db: Db, rows: DbOrder[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [items, refundRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db.select().from(refunds).where(inArray(refunds.orderId, ids)),
  ]);
  return rows.map((o) =>
    toOrder(
      o,
      items.filter((i) => i.orderId === o.id),
      refundRows.find((r) => r.orderId === o.id)
    )
  );
}

export async function listOrders(db: Db): Promise<Order[]> {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return hydrate(db, rows);
}

export async function getOrderById(db: Db, id: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.id, id));
  return (await hydrate(db, rows))[0] ?? null;
}

export async function getOrderByToken(db: Db, token: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.token, token));
  return (await hydrate(db, rows))[0] ?? null;
}

async function mustGet(db: Db, id: string): Promise<Order> {
  const order = await getOrderById(db, id);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  return order;
}

export function newOrderToken(): string {
  return 'pv_' + randomBytes(18).toString('base64url');
}

/**
 * Buat order dari payload klien. Harga, estimasi, ketersediaan, dan penerima sif
 * ditentukan ulang di server; payload klien hanya dipakai untuk mendeteksi perubahan.
 */
export async function createOrder(
  db: Db,
  payload: CreateOrderPayload,
  now: number = Date.now()
): Promise<Order> {
  const [settings, menu, shiftList] = await Promise.all([
    getSettings(db),
    listMenu(db),
    listShifts(db),
  ]);

  const pickup = resolvePickup(
    { mode: payload.mode, pickup: payload.pickup, clientEstimate: payload.estimate },
    settings,
    now
  );
  const priced = priceItems(payload.items, menu, settings.eggPrice);
  assertPriceMatches(priced, payload.total, payload.items);

  const recipient =
    shiftList.find((s) => s.id === settings.recipientShiftId) ?? shiftList[0] ?? null;
  if (!recipient) {
    throw new HttpError(409, 'Belum ada penjaga aktif. Checkout sementara ditutup.', {
      code: 'STORE_CLOSED',
    });
  }

  const id = 'ord_' + randomUUID();
  const day = wibDayKey(now);

  await db.transaction(async (tx) => {
    const [counter] = await tx
      .insert(orderCounters)
      .values({ day, last: 1 })
      .onConflictDoUpdate({
        target: orderCounters.day,
        set: { last: sql`${orderCounters.last} + 1` },
      })
      .returning({ last: orderCounters.last });

    await tx.insert(orders).values({
      id,
      token: newOrderToken(),
      number: `PV-${day}-${String(1000 + counter.last).padStart(4, '0')}`,
      createdAt: new Date(now),
      pickupAt: new Date(pickup),
      estimate: settings.estimate,
      mode: payload.mode,
      name: payload.name,
      phone: payload.phone,
      note: payload.note || null,
      recipientShiftId: recipient.id,
      total: priced.total,
    });

    await tx.insert(orderItems).values(
      priced.items.map((it: OrderItem, position) => ({
        orderId: id,
        position,
        name: it.name,
        qty: it.qty,
        unit: it.unit,
        egg: it.egg ?? null,
        temp: it.temp ?? null,
        note: it.note ?? null,
      }))
    );
  });

  return mustGet(db, id);
}

const FINAL: OrderFulfillmentStatus[] = ['COMPLETED', 'CANCELLED'];

export async function updateFulfillment(
  db: Db,
  id: string,
  next: OrderFulfillmentStatus,
  now: number = Date.now()
): Promise<Order> {
  const order = await mustGet(db, id);
  if (next === 'CANCELLED') {
    throw new HttpError(400, 'Gunakan endpoint pembatalan untuk membatalkan pesanan.');
  }
  if (FINAL.includes(order.fulfillment)) {
    throw new HttpError(409, `Pesanan sudah ${order.fulfillment} dan tidak bisa diubah.`);
  }
  if (next !== 'NEW' && order.payment !== 'PAID') {
    throw new HttpError(409, 'Pesanan belum lunas; tidak bisa diproses.');
  }
  await db
    .update(orders)
    .set({
      fulfillmentStatus: next,
      completedAt: next === 'COMPLETED' ? new Date(now) : null,
    })
    .where(eq(orders.id, id));
  return mustGet(db, id);
}

/** Tandai pembayaran. Dipanggil webhook (nanti) atau simulasi dev. Idempoten untuk PAID. */
export async function setPayment(
  db: Db,
  id: string,
  status: Order['payment'],
  now: number = Date.now()
): Promise<Order> {
  const order = await mustGet(db, id);
  if (order.payment === 'PAID') {
    if (status === 'PAID') return order; // idempoten
    throw new HttpError(409, 'Pesanan sudah lunas; status pembayaran tidak bisa diturunkan.');
  }
  const patch: Partial<typeof orders.$inferInsert> = { paymentStatus: status };
  if (status === 'PAID') {
    patch.paidAt = new Date(now);
    patch.notificationStatus = 'QUEUED';
    if (order.mode === 'asap') {
      patch.pickupAt = new Date(now + order.estimate * 60 * 1000);
    }
  }
  await db.update(orders).set(patch).where(eq(orders.id, id));
  return mustGet(db, id);
}

export async function cancelOrder(db: Db, id: string, reason: string): Promise<Order> {
  const order = await mustGet(db, id);
  if (FINAL.includes(order.fulfillment)) {
    throw new HttpError(409, `Pesanan sudah ${order.fulfillment}.`);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ fulfillmentStatus: 'CANCELLED', cancelReason: reason })
      .where(eq(orders.id, id));
    // Refund hanya relevan jika uang sudah masuk.
    if (order.payment === 'PAID') {
      await tx
        .insert(refunds)
        .values({ orderId: id, status: 'PENDING', amount: order.total, reason })
        .onConflictDoNothing();
    }
  });
  return mustGet(db, id);
}

export async function recordRefund(
  db: Db,
  id: string,
  refund: RefundRecord,
  now: number = Date.now()
): Promise<Order> {
  const order = await mustGet(db, id);
  if (order.payment !== 'PAID') {
    throw new HttpError(409, 'Hanya pesanan lunas yang bisa direfund.');
  }
  if (refund.amount > order.total) {
    throw new HttpError(400, 'Nominal refund melebihi total pesanan.');
  }
  const values = {
    status: refund.status,
    amount: refund.amount,
    reason: refund.reason,
    confirmedAt: new Date(refund.confirmedAt ?? now),
  };
  await db
    .insert(refunds)
    .values({ orderId: id, ...values })
    .onConflictDoUpdate({ target: refunds.orderId, set: values });
  return mustGet(db, id);
}

export async function setNotification(
  db: Db,
  id: string,
  status: Order['notification'],
  recipientShiftId?: string
): Promise<Order> {
  await db
    .update(orders)
    .set({
      notificationStatus: status,
      attempts: sql`${orders.attempts} + 1`,
      ...(recipientShiftId ? { recipientShiftId } : {}),
    })
    .where(eq(orders.id, id));
  return mustGet(db, id);
}

/** Ganti seluruh order dengan data demo (dev saja). */
export async function replaceOrdersWithSeed(db: Db, seeds: Order[]): Promise<Order[]> {
  await db.transaction(async (tx) => {
    await tx.delete(orders); // order_items & refunds ikut terhapus (cascade)
    for (const o of seeds) {
      await tx.insert(orders).values({
        id: o.id,
        token: o.token,
        number: o.number,
        createdAt: new Date(o.created),
        pickupAt: new Date(o.pickup),
        estimate: o.estimate,
        mode: o.mode,
        name: o.name,
        phone: o.phone,
        note: o.note ?? null,
        paymentStatus: o.payment,
        fulfillmentStatus: o.fulfillment,
        notificationStatus: o.notification,
        recipientShiftId: o.recipientShiftId,
        total: o.total,
        paidAt: o.paidAt ? new Date(o.paidAt) : null,
        completedAt: o.completedAt ? new Date(o.completedAt) : null,
        cancelReason: o.cancelReason ?? null,
        attempts: o.attempts ?? 0,
      });
      await tx.insert(orderItems).values(
        o.items.map((it, position) => ({
          orderId: o.id,
          position,
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          egg: it.egg ?? null,
          temp: it.temp ?? null,
          note: it.note ?? null,
        }))
      );
      if (o.refund) {
        await tx.insert(refunds).values({
          orderId: o.id,
          status: o.refund.status,
          amount: o.refund.amount,
          reason: o.refund.reason,
          confirmedAt: o.refund.confirmedAt ? new Date(o.refund.confirmedAt) : null,
        });
      }
    }
  });
  return listOrders(db);
}
