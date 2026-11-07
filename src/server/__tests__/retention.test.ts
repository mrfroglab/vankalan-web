// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));

import { eq } from 'drizzle-orm';
import type { CreateOrderPayload } from '@/types';
import { setDbForTesting, type Db } from '../db';
import { orderItems, orders, paymentEvents, refunds } from '../db/schema';
import { cancelOrder, createOrder, getOrderById, setPayment, updateFulfillment } from '../repos/orders';
import {
  REDACTED_NAME,
  REDACTED_PHONE,
  getRetentionConfig,
  isOrderLinkExpired,
  purgeExpiredData,
} from '../retention';
import { makeTestDb } from './helpers';
import * as tokenRoute from '@/app/api/orders/token/[token]/route';
import * as payRoute from '@/app/api/orders/token/[token]/pay/route';
import * as purgeRoute from '@/app/api/maintenance/purge/route';

const DAY = 24 * 60 * 60 * 1000;
let db: Db;

const payload = (): CreateOrderPayload => ({
  name: 'Raka', phone: '6281234567890', mode: 'asap', pickup: Date.now(), estimate: 10,
  items: [{ name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true, note: 'tanpa sayur' }],
  total: 14000, note: 'jangan pedas',
});

/** Buat order lalu mundurkan created_at ke `ageDays` hari lalu. */
async function aged(ageDays: number, opts: { paid?: boolean; fulfillment?: 'COMPLETED' | 'CANCELLED' | 'NEW' | 'PREPARING' } = {}) {
  const o = await createOrder(db, payload());
  if (opts.paid) await setPayment(db, o.id, 'PAID');
  if (opts.fulfillment === 'COMPLETED') await updateFulfillment(db, o.id, 'COMPLETED');
  if (opts.fulfillment === 'PREPARING') await updateFulfillment(db, o.id, 'PREPARING');
  if (opts.fulfillment === 'CANCELLED') await cancelOrder(db, o.id, 'batal');
  await db.update(orders).set({ createdAt: new Date(Date.now() - ageDays * DAY) }).where(eq(orders.id, o.id));
  return o;
}

beforeEach(async () => {
  db = await makeTestDb();
  setDbForTesting(db);
  vi.stubEnv('NODE_ENV', 'test');
});
afterEach(() => {
  setDbForTesting(null);
  vi.unstubAllEnvs();
});

describe('konfigurasi', () => {
  it('default usulan dan override env; nilai tak valid diabaikan', () => {
    expect(getRetentionConfig()).toEqual({ linkTtlDays: 30, piiDays: 90, unpaidDays: 7, eventDays: 180 });
    vi.stubEnv('PII_RETENTION_DAYS', '30');
    vi.stubEnv('ORDER_LINK_TTL_DAYS', 'abc');
    vi.stubEnv('UNPAID_RETENTION_DAYS', '0');
    expect(getRetentionConfig()).toMatchObject({ piiDays: 30, linkTtlDays: 30, unpaidDays: 7 });
  });
});

describe('isOrderLinkExpired', () => {
  const now = 100 * DAY;
  const cfg = { linkTtlDays: 30, piiDays: 90, unpaidDays: 7, eventDays: 180 };
  const o = (ageDays: number, payment: 'PAID' | 'PENDING', fulfillment: 'NEW' | 'COMPLETED' | 'READY') =>
    ({ created: now - ageDays * DAY, payment, fulfillment }) as never;

  it('kedaluwarsa setelah TTL untuk pesanan yang tidak sedang berjalan', () => {
    expect(isOrderLinkExpired(o(29, 'PAID', 'COMPLETED'), now, cfg)).toBe(false);
    expect(isOrderLinkExpired(o(31, 'PAID', 'COMPLETED'), now, cfg)).toBe(true);
    expect(isOrderLinkExpired(o(31, 'PENDING', 'NEW'), now, cfg)).toBe(true);
  });
  it('pesanan lunas yang masih berjalan tidak pernah kedaluwarsa', () => {
    expect(isOrderLinkExpired(o(400, 'PAID', 'NEW'), now, cfg)).toBe(false);
    expect(isOrderLinkExpired(o(400, 'PAID', 'READY'), now, cfg)).toBe(false);
  });
});

describe('purgeExpiredData', () => {
  it('menghapus pesanan tak pernah lunas yang lewat batas; yang baru dan yang lunas aman', async () => {
    const old = await aged(10);
    const fresh = await aged(2);
    const oldPaid = await aged(10, { paid: true, fulfillment: 'PREPARING' });
    const r = await purgeExpiredData(db);
    expect(r.deletedUnpaid).toBe(1);
    expect(await getOrderById(db, old.id)).toBeNull();
    expect(await getOrderById(db, fresh.id)).not.toBeNull();
    expect(await getOrderById(db, oldPaid.id)).not.toBeNull();
    // cascade: item pesanan terhapus ikut
    expect(await db.select().from(orderItems).where(eq(orderItems.orderId, old.id))).toHaveLength(0);
  });

  it('menganonimkan data pribadi pesanan selesai/batal yang lewat masa simpan; total & item tetap', async () => {
    const done = await aged(100, { paid: true, fulfillment: 'COMPLETED' });
    const r = await purgeExpiredData(db);
    expect(r.redacted).toBe(1);
    const o = (await getOrderById(db, done.id))!;
    expect(o.name).toBe(REDACTED_NAME);
    expect(o.phone).toBe(REDACTED_PHONE);
    expect(o.note).toBeUndefined();
    expect(o.items[0]).toMatchObject({ name: 'Indomie Goreng', qty: 1, unit: 14000 });
    expect(o.items[0].note).toBeUndefined();
    expect(o.total).toBe(14000);
    expect(o.payment).toBe('PAID');
  });

  it('tidak menyentuh: pesanan berjalan, yang belum cukup lama, dan refund belum tuntas', async () => {
    const running = await aged(400, { paid: true, fulfillment: 'PREPARING' });
    const recent = await aged(10, { paid: true, fulfillment: 'COMPLETED' });
    const refundPending = await aged(400, { paid: true, fulfillment: 'CANCELLED' }); // cancel -> refund PENDING
    const r = await purgeExpiredData(db);
    expect(r.redacted).toBe(0);
    for (const x of [running, recent, refundPending]) {
      expect((await getOrderById(db, x.id))!.name).toBe('Raka');
    }
    // setelah refund tuntas, baru boleh dianonimkan
    await db.update(refunds).set({ status: 'FULL_REFUNDED' }).where(eq(refunds.orderId, refundPending.id));
    expect((await purgeExpiredData(db)).redacted).toBe(1);
    expect((await getOrderById(db, refundPending.id))!.name).toBe(REDACTED_NAME);
  });

  it('tidak menghapus pesanan tak lunas yang punya catatan refund', async () => {
    const o = await aged(30);
    await db.insert(refunds).values({ orderId: o.id, status: 'PENDING', amount: 1, reason: 'x' });
    expect((await purgeExpiredData(db)).deletedUnpaid).toBe(0);
    expect(await getOrderById(db, o.id)).not.toBeNull();
  });

  it('mengosongkan payload mentah log pembayaran lama, baris audit tetap', async () => {
    await db.insert(paymentEvents).values([
      { midtransOrderId: 'A', source: 'webhook', result: 'applied', raw: { x: 1 }, createdAt: new Date(Date.now() - 200 * DAY) },
      { midtransOrderId: 'B', source: 'webhook', result: 'applied', raw: { x: 2 } },
    ]);
    expect((await purgeExpiredData(db)).eventsPruned).toBe(1);
    const rows = await db.select().from(paymentEvents).orderBy(paymentEvents.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].raw).toBeNull();
    expect(rows[1].raw).toEqual({ x: 2 });
  });

  it('idempoten: menjalankan ulang tidak mengubah apa pun', async () => {
    await aged(10);
    await aged(100, { paid: true, fulfillment: 'COMPLETED' });
    const first = await purgeExpiredData(db);
    expect(first).toMatchObject({ deletedUnpaid: 1, redacted: 1 });
    expect(await purgeExpiredData(db)).toEqual({ deletedUnpaid: 0, redacted: 0, eventsPruned: 0 });
  });

  it('menghormati override env (masa simpan lebih pendek)', async () => {
    vi.stubEnv('PII_RETENTION_DAYS', '5');
    await aged(6, { paid: true, fulfillment: 'COMPLETED' });
    expect((await purgeExpiredData(db)).redacted).toBe(1);
  });
});

describe('route', () => {
  const ctx = (token: string) => ({ params: Promise.resolve({ token }) }) as never;

  it('tautan privat yang kedaluwarsa dijawab 410; yang masih berlaku 200; pesanan berjalan tetap 200', async () => {
    const expired = await aged(31, { paid: true, fulfillment: 'COMPLETED' });
    const ok = await aged(5);
    const longRunning = await aged(200, { paid: true, fulfillment: 'PREPARING' });
    expect((await tokenRoute.GET(new Request('http://t'), ctx(expired.token))).status).toBe(410);
    expect((await tokenRoute.GET(new Request('http://t'), ctx(ok.token))).status).toBe(200);
    expect((await tokenRoute.GET(new Request('http://t'), ctx(longRunning.token))).status).toBe(200);
  });

  it('bayar ulang pada tautan kedaluwarsa ditolak 410', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'SB-key');
    const expired = await aged(31);
    const res = await payRoute.POST(new Request('http://t', { method: 'POST' }), ctx(expired.token));
    expect(res.status).toBe(410);
  });

  it('POST /api/maintenance/purge: khusus admin, mengembalikan ringkasan', async () => {
    await aged(10);
    const ok = await purgeRoute.POST(new Request('http://t', { method: 'POST' }));
    expect(await ok.json()).toMatchObject({ deletedUnpaid: 1, config: { piiDays: 90 } });

    vi.stubEnv('ADMIN_PASSWORD', 'x');
    vi.stubEnv('SESSION_SECRET', 's'.repeat(40));
    expect((await purgeRoute.POST(new Request('http://t', { method: 'POST' }))).status).toBe(401);
  });
});
