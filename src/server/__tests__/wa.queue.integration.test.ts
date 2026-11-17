// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));

import { eq } from 'drizzle-orm';
import type { CreateOrderPayload } from '@/types';
import { setDbForTesting, type Db } from '../db';
import { notificationJobs } from '../db/schema';
import { cancelOrder, createOrder, getOrderById, listOrders, setPayment, updateFulfillment } from '../repos/orders';
import { patchSettings, replaceShifts } from '../repos/settings';
import { reserveAttempt } from '../repos/payments';
import { applyAndNotify } from '../payments/service';
import { computeSignature } from '../payments/midtrans';
import { enqueueNewOrder, processDueJobs, resendNotification } from '../wa/queue';
import { makeTestDb } from './helpers';
import * as statusRoute from '@/app/api/wa/status/route';

const SEC = 1000;
type SendMode = 'ok' | 'refused' | 'http500' | 'timeout' | 'reset';

let db: Db;
let sendMode: SendMode;
let sends: { chatId: string; text: string }[];
let history: { body: string; fromMe: boolean; timestamp: number }[] | 'error';
let sessionStatus = 'WORKING';

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
  if (url.endsWith('/api/sendText')) {
    const b = JSON.parse(String(init?.body));
    if (sendMode === 'refused') return Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }));
    if (sendMode === 'http500') return json(500, { error: 'boom' });
    if (sendMode === 'timeout') return Promise.reject(Object.assign(new Error('t'), { name: 'TimeoutError' }));
    if (sendMode === 'reset') return Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }));
    sends.push({ chatId: b.chatId, text: b.text });
    return json(201, { id: `true_${b.chatId}_${sends.length}` });
  }
  if (url.includes('/chats/')) return history === 'error' ? json(500, {}) : json(200, history);
  if (url.includes('/api/sessions/')) return json(200, { status: sessionStatus });
  return json(404, {});
}

const payload = (): CreateOrderPayload => ({
  name: 'Raka', phone: '6281234567890', mode: 'asap', pickup: Date.now(), estimate: 10,
  items: [{ name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true }], total: 14000,
});

async function paidOrder() {
  const o = await createOrder(db, payload());
  await setPayment(db, o.id, 'PAID');
  return (await getOrderById(db, o.id))!;
}
const jobOf = async (orderId: string) =>
  (await db.select().from(notificationJobs).where(eq(notificationJobs.orderId, orderId)).orderBy(notificationJobs.id));

beforeEach(async () => {
  db = await makeTestDb();
  setDbForTesting(db);
  sendMode = 'ok';
  sends = [];
  history = [];
  sessionStatus = 'WORKING';
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('WAHA_BASE_URL', 'http://waha.test');
  vi.stubEnv('WAHA_API_KEY', 'k');
  vi.stubEnv('WA_RETRY_DELAYS_SECONDS', '30,120,300');
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
});
afterEach(() => {
  setDbForTesting(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('antrean notifikasi WA', () => {
  it('order lunas → tugas dengan snapshot penerima sif aktif; idempoten', async () => {
    const o = await paidOrder();
    const a = await enqueueNewOrder(db, o.id);
    const b = await enqueueNewOrder(db, o.id);
    expect(a!.id).toBe(b!.id);
    expect(await jobOf(o.id)).toHaveLength(1);
    expect(a).toMatchObject({ status: 'QUEUED', recipientShiftId: 's1', recipientName: 'Aa Iis', recipientPhone: '6281234500001', maxAttempts: 4 });
    expect(await enqueueNewOrder(db, (await createOrder(db, payload())).id)).toBeNull(); // belum lunas
  });

  it('terkirim: pesan ke penerima aktif memuat nomor order, kontak, dan waktu ambil', async () => {
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    expect(await processDueJobs(db)).toMatchObject({ sent: 1 });
    expect(sends).toHaveLength(1);
    expect(sends[0].chatId).toBe('6281234500001@c.us');
    expect(sends[0].text).toContain(o.number);
    expect(sends[0].text).toContain('6281234567890');
    expect(sends[0].text).toContain('Ambil:');
    const after = (await getOrderById(db, o.id))!;
    expect(after).toMatchObject({ notification: 'SENT', attempts: 1 });
    expect(after.notificationDetail).toMatchObject({ jobStatus: 'SENT', recipientName: 'Aa Iis' });
    expect((await jobOf(o.id))[0].providerMessageId).toContain('true_6281234500001@c.us');
    expect(await processDueJobs(db)).toMatchObject({ sent: 0 }); // tidak diproses ulang
    expect(sends).toHaveLength(1);
  });

  it('WAHA mati: retry 30dtk → 2mnt → 5mnt, lalu FAILED perlu tindakan manual; order tetap utuh', async () => {
    sendMode = 'refused';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();

    await processDueJobs(db, { now: t0 });
    let j = (await jobOf(o.id))[0];
    expect(j).toMatchObject({ status: 'QUEUED', attempts: 1 });
    expect(j.nextAttemptAt.getTime()).toBe(t0 + 30 * SEC);
    expect((await getOrderById(db, o.id))!.notification).toBe('FAILED'); // terlihat di dashboard

    expect(await processDueJobs(db, { now: t0 + 29 * SEC })).toMatchObject({ failed: 0 }); // belum waktunya
    await processDueJobs(db, { now: t0 + 30 * SEC });
    j = (await jobOf(o.id))[0];
    expect(j.attempts).toBe(2);
    expect(j.nextAttemptAt.getTime()).toBe(t0 + 30 * SEC + 120 * SEC);

    await processDueJobs(db, { now: t0 + 150 * SEC });
    await processDueJobs(db, { now: t0 + 450 * SEC });
    j = (await jobOf(o.id))[0];
    expect(j).toMatchObject({ status: 'FAILED', attempts: 4 });
    expect(j.lastError).toContain('ECONNREFUSED');

    await processDueJobs(db, { now: t0 + 99999 * SEC }); // tidak ada percobaan otomatis lagi
    expect((await jobOf(o.id))[0].attempts).toBe(4);
    const o2 = (await getOrderById(db, o.id))!;
    expect(o2.payment).toBe('PAID');
    expect(o2.notification).toBe('FAILED');
  });

  it('pulih setelah gagal: percobaan berikutnya berhasil', async () => {
    sendMode = 'http500';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    sendMode = 'ok';
    await processDueJobs(db, { now: t0 + 31 * SEC });
    expect((await getOrderById(db, o.id))!).toMatchObject({ notification: 'SENT', attempts: 2 });
    expect(sends).toHaveLength(1);
  });

  it('timeout = UNKNOWN: tidak di-retry buta; riwayat WA diperiksa dulu', async () => {
    sendMode = 'timeout';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    expect((await getOrderById(db, o.id))!.notification).toBe('UNKNOWN');

    // Pesan ternyata sudah sampai; riwayat memuatnya.
    sendMode = 'ok';
    history = [{ body: `No. order: ${o.number}`, fromMe: true, timestamp: (t0 + 5 * SEC) / 1000 }];
    await processDueJobs(db, { now: t0 + 60 * SEC }); // belum waktunya verifikasi
    expect((await getOrderById(db, o.id))!.notification).toBe('UNKNOWN');
    await processDueJobs(db, { now: t0 + 121 * SEC });
    expect((await getOrderById(db, o.id))!.notification).toBe('SENT');
    expect(sends).toHaveLength(0); // tidak ada pengiriman ganda
    expect((await jobOf(o.id))[0].lastError).toContain('Terverifikasi');
  });

  it('UNKNOWN dan riwayat tidak memuat pesan → aman dikirim ulang', async () => {
    sendMode = 'reset';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    sendMode = 'ok';
    history = [];
    await processDueJobs(db, { now: t0 + 121 * SEC }); // verifikasi → antre ulang
    await processDueJobs(db, { now: t0 + 122 * SEC }); // kirim
    expect(sends).toHaveLength(1);
    expect((await getOrderById(db, o.id))!.notification).toBe('SENT');
  });

  it('UNKNOWN dan riwayat tak terbaca: tetap UNKNOWN, berhenti otomatis setelah 3x dan minta cek manual', async () => {
    sendMode = 'timeout';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    history = 'error';
    sendMode = 'ok';
    for (let i = 1; i <= 5; i++) await processDueJobs(db, { now: t0 + i * 130 * SEC });
    const j = (await jobOf(o.id))[0];
    expect(j.status).toBe('UNKNOWN');
    expect(j.verifyAttempts).toBe(3);
    expect(j.lastError).toContain('kirim ulang manual');
    expect(sends).toHaveLength(0);
  });

  it('sesi WA belum login (SCAN_QR_CODE): FAILED pasti + retry otomatis, bukan UNKNOWN; terkirim setelah scan QR', async () => {
    sessionStatus = 'SCAN_QR_CODE';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    let j = (await jobOf(o.id))[0];
    expect(j.status).toBe('QUEUED'); // dijadwalkan ulang, bukan UNKNOWN
    expect(j.lastError).toContain('SCAN_QR_CODE');
    expect(sends).toHaveLength(0);
    sessionStatus = 'WORKING'; // penjaga scan QR
    await processDueJobs(db, { now: t0 + 31 * SEC });
    j = (await jobOf(o.id))[0];
    expect(j.status).toBe('SENT');
    expect(sends).toHaveLength(1);
  });

  it('UNKNOWN saat sesi WA mati: verifikasi ditunda tanpa menghabiskan jatah, lanjut setelah sesi aktif', async () => {
    sendMode = 'timeout';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    sessionStatus = 'SCAN_QR_CODE';
    for (let i = 1; i <= 5; i++) await processDueJobs(db, { now: t0 + i * 130 * SEC });
    let j = (await jobOf(o.id))[0];
    expect(j).toMatchObject({ status: 'UNKNOWN', verifyAttempts: 0 });
    expect(j.lastError).toContain('menunggu sesi WhatsApp aktif');
    sessionStatus = 'WORKING';
    history = [{ body: `No. order: ${o.number}`, fromMe: true, timestamp: (t0 + 5 * SEC) / 1000 }];
    await processDueJobs(db, { now: t0 + 6 * 130 * SEC });
    j = (await jobOf(o.id))[0];
    expect(j.status).toBe('SENT');
    expect(sends).toHaveLength(0);
  });

  it('proses mati di tengah kirim (lease habis): jadi UNKNOWN, tidak dikirim ulang buta', async () => {
    const o = await paidOrder();
    const job = (await enqueueNewOrder(db, o.id))!;
    const t0 = Date.now();
    await db.update(notificationJobs).set({ status: 'SENDING', attempts: 1, lockedUntil: new Date(t0 - SEC) }).where(eq(notificationJobs.id, job.id));
    history = [];
    await processDueJobs(db, { now: t0 }); // klaim: SENDING basi → UNKNOWN
    expect((await jobOf(o.id))[0].status).toBe('UNKNOWN');
    expect(sends).toHaveLength(0);
    await processDueJobs(db, { now: t0 + 121 * SEC }); // verifikasi: tak ada → antre ulang
    await processDueJobs(db, { now: t0 + 122 * SEC });
    expect(sends).toHaveLength(1);
  });

  it('order selesai/dibatalkan sebelum terkirim: tidak mengirim instruksi masak (7.3.5)', async () => {
    sendMode = 'refused';
    const done = await paidOrder();
    await enqueueNewOrder(db, done.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 }); // gagal, menunggu retry
    sendMode = 'ok';
    await updateFulfillment(db, done.id, 'COMPLETED');

    const cancelled = await paidOrder();
    await enqueueNewOrder(db, cancelled.id);
    await cancelOrder(db, cancelled.id, 'stok habis');

    await processDueJobs(db, { now: t0 + 31 * SEC });
    expect(sends).toHaveLength(0);
    expect((await jobOf(done.id))[0]).toMatchObject({ status: 'CANCELLED' });
    expect((await jobOf(done.id))[0].lastError).toContain('selesai');
    expect((await jobOf(cancelled.id))[0].lastError).toContain('dibatalkan');
  });

  it('sif berganti: retry otomatis tetap ke penerima awal; kirim ulang manual eksplisit ke sif aktif', async () => {
    sendMode = 'refused';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    const t0 = Date.now();
    await processDueJobs(db, { now: t0 });
    await patchSettings(db, { recipientShiftId: 's2' }); // ganti sif

    sendMode = 'ok';
    await processDueJobs(db, { now: t0 + 31 * SEC });
    expect(sends[0].chatId).toBe('6281234500001@c.us'); // retry otomatis: penerima historis

    const o2 = await paidOrder(); // order berikutnya → penerima baru
    await enqueueNewOrder(db, o2.id);
    await processDueJobs(db);
    expect(sends[1].chatId).toBe('6281234500002@c.us');

    // Kirim ulang manual untuk order pertama ke sif aktif (s2), diberi label.
    const r = await resendNotification(db, o.id);
    expect(r.alreadySent).toBe(false);
    expect(sends[2].chatId).toBe('6281234500002@c.us');
    expect(sends[2].text).toContain('[KIRIM ULANG');
    expect(r.order.recipientShiftId).toBe('s2');
    const jobs = await jobOf(o.id);
    expect(jobs.map((j) => j.kind)).toEqual(['NEW_ORDER', 'RESEND']);
  });

  it('tanpa penerima aktif: tugas FAILED dengan alasan jelas', async () => {
    const o = await paidOrder();
    await replaceShifts(db, []);
    const j = await enqueueNewOrder(db, o.id);
    expect(j).toMatchObject({ status: 'FAILED' });
    expect(j!.lastError).toContain('penerima');
    expect((await getOrderById(db, o.id))!.notification).toBe('FAILED');
    expect(sends).toHaveLength(0);
  });

  it('WA ditandai terputus (waConnected=false): tugas dijeda tanpa menghabiskan percobaan', async () => {
    await patchSettings(db, { waConnected: false });
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    expect((await processDueJobs(db)).paused).toBe(true);
    expect((await jobOf(o.id))[0]).toMatchObject({ status: 'QUEUED', attempts: 0 });
    await patchSettings(db, { waConnected: true });
    await processDueJobs(db);
    expect((await getOrderById(db, o.id))!.notification).toBe('SENT');
  });

  it('pemrosesan paralel tidak mengirim ganda (klaim eksklusif)', async () => {
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    await Promise.all([processDueJobs(db), processDueJobs(db), processDueJobs(db)]);
    expect(sends).toHaveLength(1);
    expect((await jobOf(o.id))[0].attempts).toBe(1);
  });
});

describe('kirim ulang manual', () => {
  it('UNKNOWN + pesan sudah ada di riwayat → tidak mengirim ganda', async () => {
    sendMode = 'timeout';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    await processDueJobs(db);
    sendMode = 'ok';
    history = [{ body: `halo ${o.number}`, fromMe: true, timestamp: Date.now() / 1000 + 1 }];
    const r = await resendNotification(db, o.id);
    expect(r.alreadySent).toBe(true);
    expect(r.order.notification).toBe('SENT');
    expect(sends).toHaveLength(0);
  });

  it('UNKNOWN + riwayat tak terbaca → penjaga memutuskan kirim ulang (berlabel)', async () => {
    sendMode = 'timeout';
    const o = await paidOrder();
    await enqueueNewOrder(db, o.id);
    await processDueJobs(db);
    sendMode = 'ok';
    history = 'error';
    const r = await resendNotification(db, o.id);
    expect(r.alreadySent).toBe(false);
    expect(sends).toHaveLength(1);
    expect(r.order.notification).toBe('SENT');
  });

  it('menolak: belum lunas, sudah selesai, atau sedang dikirim', async () => {
    const unpaid = await createOrder(db, payload());
    await expect(resendNotification(db, unpaid.id)).rejects.toMatchObject({ status: 409 });
    await expect(resendNotification(db, 'nope')).rejects.toMatchObject({ status: 404 });

    const o = await paidOrder();
    const job = (await enqueueNewOrder(db, o.id))!;
    await db.update(notificationJobs).set({ status: 'SENDING', lockedUntil: new Date(Date.now() + 60_000) }).where(eq(notificationJobs.id, job.id));
    await expect(resendNotification(db, o.id)).rejects.toMatchObject({ status: 409 });

    await db.update(notificationJobs).set({ status: 'SENT', lockedUntil: null }).where(eq(notificationJobs.id, job.id));
    await updateFulfillment(db, o.id, 'COMPLETED');
    await expect(resendNotification(db, o.id)).rejects.toMatchObject({ status: 409 });
  });
});

describe('integrasi pembayaran → WA', () => {
  const KEY = 'SB-Mid-server-test';
  it('webhook PAID berulang menghasilkan tepat satu pesan WA', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', KEY);
    const o = await createOrder(db, payload());
    const txn = await reserveAttempt(db, o);
    const base = { order_id: txn.midtransOrderId, status_code: '200', gross_amount: '14000.00', transaction_status: 'settlement' };
    const body = { ...base, signature_key: computeSignature(base, KEY) };
    await Promise.all(Array.from({ length: 4 }, () => applyAndNotify(db, body, 'webhook')));
    await applyAndNotify(db, body, 'webhook');
    expect(sends).toHaveLength(1);
    expect(await jobOf(o.id)).toHaveLength(1);
    expect((await getOrderById(db, o.id))!.notification).toBe('SENT');
  });

  it('WAHA mati saat pembayaran: order tetap PAID dan terlihat sebagai notifikasi gagal', async () => {
    sendMode = 'refused';
    vi.stubEnv('MIDTRANS_SERVER_KEY', KEY);
    const o = await createOrder(db, payload());
    const txn = await reserveAttempt(db, o);
    const base = { order_id: txn.midtransOrderId, status_code: '200', gross_amount: '14000.00', transaction_status: 'settlement' };
    await applyAndNotify(db, { ...base, signature_key: computeSignature(base, KEY) }, 'webhook');
    const after = (await listOrders(db))[0];
    expect(after).toMatchObject({ payment: 'PAID', notification: 'FAILED' });
  });
});

describe('GET /api/wa/status', () => {
  const call = () => statusRoute.GET(new Request('http://t/api/wa/status'));
  it('melaporkan sesi aktif, perlu scan QR, dan tak terjangkau', async () => {
    expect(await (await call()).json()).toMatchObject({ configured: true, reachable: true, status: 'WORKING', needsQr: false });
    sessionStatus = 'SCAN_QR_CODE';
    expect(await (await call()).json()).toMatchObject({ needsQr: true });
    vi.stubEnv('WAHA_BASE_URL', '');
    expect(await (await call()).json()).toEqual({ configured: false });
  });
  it('khusus admin saat auth terkonfigurasi', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'x');
    vi.stubEnv('SESSION_SECRET', 's'.repeat(40));
    expect((await call()).status).toBe(401);
  });
});
