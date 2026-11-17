// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));

import { and, eq } from 'drizzle-orm';
import type { CreateOrderPayload } from '@/types';
import { setDbForTesting, type Db } from '../db';
import { paymentEvents, paymentTransactions } from '../db/schema';
import { computeSignature, getMidtransConfig, type MidtransStatusPayload } from '../payments/midtrans';
import { reconcileOrder, reconcilePending, resumePayment, startPayment } from '../payments/service';
import { applyGatewayStatus, midtransOrderIdFor, reserveAttempt } from '../repos/payments';
import { cancelOrder, createOrder, getOrderById } from '../repos/orders';
import { makeTestDb } from './helpers';
import * as notification from '@/app/api/payments/midtrans/notification/route';
import * as ordersRoute from '@/app/api/orders/route';
import * as tokenRoute from '@/app/api/orders/token/[token]/route';
import * as payRoute from '@/app/api/orders/token/[token]/pay/route';

const KEY = 'SB-Mid-server-test';
const MIN = 60 * 1000;

let db: Db;
let snapCalls = 0;
let snapFails = false;
let statusReplies: Record<string, MidtransStatusPayload | 'notfound'> = {};

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  if (url.startsWith('http://snap.test/snap/v1/transactions')) {
    snapCalls++;
    if (snapFails) return reply(500, { error_messages: ['boom'] });
    const body = JSON.parse(String(init?.body));
    expect(init?.headers).toMatchObject({ Authorization: 'Basic ' + Buffer.from(`${KEY}:`).toString('base64') });
    return reply(201, { token: `snap-${body.transaction_details.order_id}`, redirect_url: 'https://pay.test/x' });
  }
  const m = url.match(/^http:\/\/core\.test\/v2\/(.+)\/status$/);
  if (m) {
    const r = statusReplies[decodeURIComponent(m[1])];
    if (!r || r === 'notfound') return reply(404, { status_code: '404' });
    return reply(200, r);
  }
  return reply(404, {});
}

const orderPayload = (over: Partial<CreateOrderPayload> = {}): CreateOrderPayload => ({
  name: 'Raka',
  phone: '6281234567890',
  mode: 'asap',
  pickup: Date.now(),
  estimate: 10,
  items: [
    { name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true },
    { name: 'Teh Manis', qty: 2, unit: 5000, temp: 'Dingin' },
  ],
  total: 24000,
  ...over,
});

/** Notifikasi bertanda tangan seperti dikirim Midtrans. */
function notif(order_id: string, transaction_status: string, extra: Partial<MidtransStatusPayload> = {}) {
  const base = { order_id, status_code: '200', gross_amount: '24000.00', transaction_status, ...extra };
  return { ...base, signature_key: computeSignature(base, KEY) } as MidtransStatusPayload;
}
const post = (body: unknown) =>
  notification.POST(new Request('http://t/api/payments/midtrans/notification', { method: 'POST', body: JSON.stringify(body) }));

async function newOrder(over: Partial<CreateOrderPayload> = {}) {
  const order = await createOrder(db, orderPayload(over));
  const cfg = getMidtransConfig()!;
  await startPayment(db, cfg, order);
  return { order, mid: midtransOrderIdFor(order, 1), cfg };
}
const refetch = async (id: string) => (await getOrderById(db, id))!;
const events = async (mid: string) => db.select().from(paymentEvents).where(eq(paymentEvents.midtransOrderId, mid));

beforeEach(async () => {
  db = await makeTestDb();
  setDbForTesting(db);
  snapCalls = 0;
  snapFails = false;
  statusReplies = {};
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('MIDTRANS_SERVER_KEY', KEY);
  vi.stubEnv('MIDTRANS_SNAP_API_URL', 'http://snap.test');
  vi.stubEnv('MIDTRANS_CORE_API_URL', 'http://core.test');
  vi.stubEnv('WAHA_BASE_URL', '');
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
});
afterEach(() => {
  setDbForTesting(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('memulai pembayaran', () => {
  it('membuat percobaan 1 dengan order_id unik, menyimpan token, dan memakai ulang token yang masih berlaku', async () => {
    const { order, mid, cfg } = await newOrder();
    expect(mid).toMatch(/^PV-\d{8}-\d{4}-1-[A-Za-z0-9]{6}$/);
    const o = await refetch(order.id);
    expect(o.snapToken).toBe(`snap-${mid}`);
    expect(o.payment).toBe('PENDING');

    const again = await startPayment(db, cfg, o);
    expect(again.snapToken).toBe(`snap-${mid}`);
    expect(snapCalls).toBe(1);
  });

  it('POST /api/orders mengembalikan snapToken+redirectUrl bila Midtrans dikonfigurasi', async () => {
    const res = await ordersRoute.POST(new Request('http://t/api/orders', { method: 'POST', body: JSON.stringify(orderPayload()) }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.snapToken).toMatch(/^snap-PV-/);
    expect(body.redirectUrl).toBe('https://pay.test/x');
    expect(body.order.snapToken).toBe(body.snapToken);
  });

  it('tanpa MIDTRANS_SERVER_KEY: order tetap dibuat tanpa snapToken (mode simulasi dev)', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', '');
    const res = await ordersRoute.POST(new Request('http://t/api/orders', { method: 'POST', body: JSON.stringify(orderPayload()) }));
    expect(res.status).toBe(201);
    expect((await res.json()).snapToken).toBeUndefined();
  });

  it('Midtrans gagal: 502, order & percobaan ditandai FAILED, tidak ada token tersimpan', async () => {
    snapFails = true;
    const res = await ordersRoute.POST(new Request('http://t/api/orders', { method: 'POST', body: JSON.stringify(orderPayload()) }));
    expect(res.status).toBe(502);
    const [o] = await (await import('../repos/orders')).listOrders(db);
    expect(o.payment).toBe('FAILED');
    expect(o.snapToken).toBeUndefined();
  });

  it('batas 5 percobaan', async () => {
    const order = await createOrder(db, orderPayload());
    for (let i = 0; i < 5; i++) await reserveAttempt(db, order);
    await expect(reserveAttempt(db, order)).rejects.toMatchObject({ status: 429 });
  });
});

describe('webhook /api/payments/midtrans/notification', () => {
  it('settlement terverifikasi → PAID, paidAt terisi, notifikasi dapur dicoba sekali', async () => {
    const { order, mid } = await newOrder();
    const res = await post(notif(mid, 'settlement'));
    expect(res.status).toBe(200);
    const o = await refetch(order.id);
    expect(o.payment).toBe('PAID');
    expect(o.paidAt).toBeTypeOf('number');
    expect(o.attempts).toBe(1); // WAHA tak terkonfigurasi → FAILED, tapi dicoba tepat sekali
    expect(o.notification).toBe('FAILED');
  });

  it('webhook berulang (termasuk paralel) tidak menggandakan notifikasi', async () => {
    const { order, mid } = await newOrder();
    const results = await Promise.all(Array.from({ length: 5 }, () => post(notif(mid, 'settlement'))));
    expect(results.every((r) => r.status === 200)).toBe(true);
    await post(notif(mid, 'settlement'));
    const o = await refetch(order.id);
    expect(o.attempts).toBe(1);
    const evts = await events(mid);
    expect(evts.filter((e) => e.result === 'applied')).toHaveLength(1);
  });

  it('tidak berurutan/terlambat: pending atau expire setelah settlement tidak menurunkan status', async () => {
    const { order, mid } = await newOrder();
    await post(notif(mid, 'settlement'));
    await post(notif(mid, 'pending'));
    await post(notif(mid, 'expire'));
    await post(notif(mid, 'deny'));
    expect((await refetch(order.id)).payment).toBe('PAID');
  });

  it('settlement datang sebelum pending: tetap PAID', async () => {
    const { order, mid } = await newOrder();
    await post(notif(mid, 'settlement'));
    await post(notif(mid, 'pending'));
    expect((await refetch(order.id)).payment).toBe('PAID');
  });

  it('signature salah / nominal diubah penyerang → 403 dan order tidak lunas', async () => {
    const { order, mid } = await newOrder();
    expect((await post({ ...notif(mid, 'settlement'), signature_key: 'x'.repeat(128) })).status).toBe(403);
    const forged = { ...notif(mid, 'settlement'), gross_amount: '1.00' }; // signature lama
    expect((await post(forged)).status).toBe(403);
    expect((await refetch(order.id)).payment).toBe('PENDING');
    expect(await events(mid)).toHaveLength(0);
  });

  it('nominal valid-bertanda-tangan tapi tidak sama dengan tagihan → dicatat, TIDAK melunasi', async () => {
    const { order, mid } = await newOrder();
    const res = await post(notif(mid, 'settlement', { gross_amount: '1000.00' }));
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe('amount_mismatch');
    expect((await refetch(order.id)).payment).toBe('PENDING');
    expect((await events(mid))[0].result).toBe('amount_mismatch');
  });

  it('order tak dikenal (mis. notifikasi tes dashboard) → 200 tanpa efek', async () => {
    const res = await post(notif('payment_notif_test_123', 'settlement'));
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe('unknown_order');
  });

  it('body rusak → 400; tanpa konfigurasi → 503', async () => {
    expect((await post({ foo: 1 })).status).toBe(400);
    vi.stubEnv('MIDTRANS_SERVER_KEY', '');
    expect((await post({})).status).toBe(503);
  });

  it('capture+challenge tetap PENDING; capture+accept → PAID', async () => {
    const a = await newOrder();
    await post(notif(a.mid, 'capture', { fraud_status: 'challenge' }));
    expect((await refetch(a.order.id)).payment).toBe('PENDING');
    await post(notif(a.mid, 'capture', { fraud_status: 'accept' }));
    expect((await refetch(a.order.id)).payment).toBe('PAID');
  });

  it('deny → FAILED, expire → EXPIRED; refund/chargeback hanya dicatat', async () => {
    const a = await newOrder();
    await post(notif(a.mid, 'deny'));
    expect((await refetch(a.order.id)).payment).toBe('FAILED');
    const b = await newOrder();
    await post(notif(b.mid, 'expire'));
    expect((await refetch(b.order.id)).payment).toBe('EXPIRED');

    const c = await newOrder();
    await post(notif(c.mid, 'settlement'));
    const r = await post(notif(c.mid, 'refund'));
    expect((await r.json()).result).toBe('ignored');
    const o = await refetch(c.order.id);
    expect(o.payment).toBe('PAID');
    expect(o.refund).toBeUndefined(); // refund tetap manual
  });
});

describe('pemulihan pembayaran & kasus tepi', () => {
  it('gagal → bayar ulang membuat percobaan 2 dengan order_id berbeda, lalu lunas', async () => {
    const { order, mid, cfg } = await newOrder();
    await post(notif(mid, 'deny'));
    const retry = await resumePayment(db, cfg, order.id);
    expect(retry.snapToken).toBe(`snap-${midtransOrderIdFor(order, 2)}`);
    expect((await refetch(order.id)).payment).toBe('PENDING');
    await post(notif(midtransOrderIdFor(order, 2), 'settlement'));
    expect((await refetch(order.id)).payment).toBe('PAID');
  });

  it('bayar ulang pada order yang ternyata sudah lunas di Midtrans: tidak menagih lagi (409)', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = notif(mid, 'settlement');
    await expect(resumePayment(db, cfg, order.id)).rejects.toMatchObject({ status: 409 });
    expect((await refetch(order.id)).payment).toBe('PAID');
    expect(snapCalls).toBe(1); // tidak ada transaksi Snap baru
  });

  it('endpoint /pay: 404 token salah, 409 bila sudah lunas, token baru bila kedaluwarsa', async () => {
    const { order, mid } = await newOrder();
    const call = (token: string) => payRoute.POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ token }) } as never);
    expect((await call('nope')).status).toBe(404);
    const live = await call(order.token);
    expect((await live.json()).snapToken).toBe(`snap-${mid}`);
    await post(notif(mid, 'settlement'));
    expect((await call(order.token)).status).toBe(409);
  });

  it('pembayaran ganda (dua percobaan sama-sama lunas): refund PENDING dicatat, notifikasi tak ganda', async () => {
    const order = await createOrder(db, orderPayload());
    const t1 = await reserveAttempt(db, order);
    const t2 = await reserveAttempt(db, order);
    const first = await applyGatewayStatus(db, notif(t2.midtransOrderId, 'settlement'), 'webhook');
    const second = await applyGatewayStatus(db, notif(t1.midtransOrderId, 'settlement'), 'webhook');
    expect(first.becamePaid).toBe(true);
    expect(second).toMatchObject({ result: 'duplicate_payment', becamePaid: false });
    const o = await refetch(order.id);
    expect(o.payment).toBe('PAID');
    expect(o.refund).toMatchObject({ status: 'PENDING', amount: 24000 });
    expect(o.refund!.reason).toContain('ganda');
  });

  it('bayar setelah pesanan dibatalkan: lunas + refund PENDING otomatis', async () => {
    const { order, mid } = await newOrder();
    await cancelOrder(db, order.id, 'pelanggan batal');
    await post(notif(mid, 'settlement'));
    const o = await refetch(order.id);
    expect(o.payment).toBe('PAID');
    expect(o.fulfillment).toBe('CANCELLED');
    expect(o.refund).toMatchObject({ status: 'PENDING', amount: 24000 });
  });

  it('asap: pickup dihitung ulang dari waktu lunas; scheduled terlambat: ditandai perlu konfirmasi waktu', async () => {
    const asap = await newOrder();
    await applyGatewayStatus(db, notif(asap.mid, 'settlement'), 'webhook', Date.now() + 30 * MIN);
    const a = await refetch(asap.order.id);
    expect(a.pickup).toBeGreaterThan(Date.now() + 35 * MIN);
    expect(a.needsTimeConfirmation).toBeUndefined();

    const late = await newOrder({ mode: 'scheduled', pickup: Date.now() + 20 * MIN });
    await applyGatewayStatus(db, notif(late.mid, 'settlement'), 'webhook', Date.now() + 30 * MIN);
    expect((await refetch(late.order.id)).needsTimeConfirmation).toBe(true);

    const ontime = await newOrder({ mode: 'scheduled', pickup: Date.now() + 40 * MIN });
    await applyGatewayStatus(db, notif(ontime.mid, 'settlement'), 'webhook', Date.now() + 5 * MIN);
    expect((await refetch(ontime.order.id)).needsTimeConfirmation).toBeUndefined();
  });
});

describe('akun Midtrans baru: server key ber-scope + Signature Secret Key terpisah', () => {
  const SIG = 'Mid-server-signature-test';
  const signed = (order_id: string, transaction_status: string) => {
    const base = { order_id, status_code: '200', gross_amount: '24000.00', transaction_status };
    return { ...base, signature_key: computeSignature(base, SIG) } as MidtransStatusPayload;
  };

  it('webhook dan Status API diverifikasi dengan MIDTRANS_SIGNATURE_KEY, Snap tetap memakai server key', async () => {
    vi.stubEnv('MIDTRANS_SIGNATURE_KEY', SIG);
    const { order, mid, cfg } = await newOrder(); // fakeFetch memastikan Snap memakai server key
    expect(cfg.signatureKey).toBe(SIG);
    // Signature dengan server key (gaya akun lama) ditolak bila signature key diatur.
    expect((await post(notif(mid, 'settlement'))).status).toBe(403);
    expect((await post(signed(mid, 'settlement'))).status).toBe(200);
    expect((await refetch(order.id)).payment).toBe('PAID');

    const second = await newOrder();
    statusReplies[second.mid] = signed(second.mid, 'settlement');
    const r = await reconcileOrder(db, cfg, second.order.id);
    expect(r[0]).toMatchObject({ result: 'applied', becamePaid: true });
  });

  it('tanpa MIDTRANS_SIGNATURE_KEY: signature memakai server key (akun lama)', async () => {
    const { cfg } = await newOrder();
    expect(cfg.signatureKey).toBe(KEY);
  });
});

describe('rekonsiliasi', () => {
  it('menerapkan status resmi dari Status API saat webhook hilang', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = notif(mid, 'settlement');
    const r = await reconcileOrder(db, cfg, order.id);
    expect(r[0]).toMatchObject({ result: 'applied', becamePaid: true });
    expect((await refetch(order.id)).payment).toBe('PAID');
  });

  it('Status API 404 (belum pilih metode): tetap PENDING sebelum kedaluwarsa, EXPIRED setelahnya', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = 'notfound';
    await reconcileOrder(db, cfg, order.id, { now: Date.now() + 5 * MIN });
    expect((await refetch(order.id)).payment).toBe('PENDING');
    await reconcileOrder(db, cfg, order.id, { now: Date.now() + 20 * MIN });
    expect((await refetch(order.id)).payment).toBe('EXPIRED');
    const [txn] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.midtransOrderId, mid)));
    expect(txn.status).toBe('EXPIRED');
  });

  it('Status API error/ signature salah tidak mengubah apa pun dan tidak melempar', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = { ...notif(mid, 'settlement'), signature_key: 'x'.repeat(128) };
    await expect(reconcileOrder(db, cfg, order.id)).resolves.toEqual([]);
    expect((await refetch(order.id)).payment).toBe('PENDING');
  });

  it('pembatasan frekuensi (minIntervalMs) melewati percobaan yang baru dicek', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = 'notfound';
    await reconcileOrder(db, cfg, order.id, { minIntervalMs: 30_000 });
    const before = vi.mocked(fetch).mock.calls.length;
    await reconcileOrder(db, cfg, order.id, { minIntervalMs: 30_000 });
    expect(vi.mocked(fetch).mock.calls.length).toBe(before);
  });

  it('GET /api/orders/token/:token melunasi lewat Status API (jaring pengaman webhook)', async () => {
    const { order, mid } = await newOrder();
    statusReplies[mid] = notif(mid, 'settlement');
    const res = await tokenRoute.GET(new Request('http://t'), { params: Promise.resolve({ token: order.token }) } as never);
    expect((await res.json()).payment).toBe('PAID');
  });

  it('reconcilePending memproses order PENDING yang cukup lama', async () => {
    const { order, mid, cfg } = await newOrder();
    statusReplies[mid] = notif(mid, 'settlement');
    const s = await reconcilePending(db, cfg, { olderThanMs: 0, now: Date.now() + MIN });
    expect(s).toMatchObject({ checked: 1, applied: 1, paid: 1 });
    expect((await refetch(order.id)).payment).toBe('PAID');
  });
});
