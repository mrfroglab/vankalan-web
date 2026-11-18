// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildKitchenOrderWhatsAppMessage } from '@/lib/waha';
import type { Order } from '@/types';
import {
  controlSession,
  fetchLoginQr,
  getSessionState,
  sendWhatsAppText,
  toChatId,
  wasMessageSent,
  type WahaConfig,
} from '../wa/waha';

const cfg: WahaConfig = { baseUrl: 'http://waha.test', session: 'default', apiKey: 'secret', timeoutMs: 2000 };
const res = (status: number, body: unknown = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const netErr = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

afterEach(() => vi.unstubAllGlobals());

describe('sendWhatsAppText: klasifikasi hasil', () => {
  const send = () => sendWhatsAppText(cfg, '6281234500001', 'halo');

  it('2xx = SENT, id pesan dibaca defensif (string/objek)', async () => {
    // Response baru per panggilan (pre-check sesi juga membaca body).
    const always = (status: number, body: unknown) => vi.fn().mockImplementation(() => Promise.resolve(res(status, body)));
    vi.stubGlobal('fetch', always(201, { id: 'true_628@c.us_ABC' }));
    expect(await send()).toEqual({ kind: 'SENT', messageId: 'true_628@c.us_ABC' });
    vi.stubGlobal('fetch', always(201, { id: { _serialized: 'X1' } }));
    expect(await send()).toEqual({ kind: 'SENT', messageId: 'X1' });
    vi.stubGlobal('fetch', always(200, 'bukan json'));
    expect(await send()).toEqual({ kind: 'SENT', messageId: undefined });
  });

  it('mengirim chatId @c.us, session, dan X-Api-Key', async () => {
    const f = vi.fn().mockResolvedValue(res(201, {}));
    vi.stubGlobal('fetch', f);
    await send();
    const [url, init] = f.mock.calls.find(([u]) => String(u).endsWith('/api/sendText'))!;
    expect(url).toBe('http://waha.test/api/sendText');
    expect(JSON.parse(init.body)).toEqual({ session: 'default', chatId: '6281234500001@c.us', text: 'halo' });
    expect(init.headers['X-Api-Key']).toBe('secret');
  });

  it('4xx/5xx = FAILED (WAHA menolak); 504 = UNKNOWN', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(422, 'session not ready')));
    expect(await send()).toMatchObject({ kind: 'FAILED', error: expect.stringContaining('422') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(500)));
    expect((await send()).kind).toBe('FAILED');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(504)));
    expect((await send()).kind).toBe('UNKNOWN');
  });

  it('koneksi tak pernah terbentuk = FAILED; timeout/putus di tengah = UNKNOWN', async () => {
    for (const code of ['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH']) {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr(code)));
      expect((await send()).kind).toBe('FAILED');
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' })));
    expect((await send()).kind).toBe('UNKNOWN');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr('ECONNRESET')));
    expect((await send()).kind).toBe('UNKNOWN');
  });

  it('sesi jelas tidak WORKING = FAILED tanpa memanggil sendText (WAHA asli menahan ~10 dtk lalu 422)', async () => {
    for (const status of ['SCAN_QR_CODE', 'STARTING', 'STOPPED', 'FAILED']) {
      const f = vi.fn().mockResolvedValue(res(200, { name: 'default', status }));
      vi.stubGlobal('fetch', f);
      expect(await send()).toMatchObject({ kind: 'FAILED', error: expect.stringContaining(status) });
      expect(f.mock.calls.some(([u]) => String(u).endsWith('/api/sendText'))).toBe(false);
    }
  });

  it('status sesi tak terbaca (non-2xx/timeout) tidak menghalangi kirim', async () => {
    const f = vi.fn().mockImplementation((u: string) =>
      Promise.resolve(String(u).includes('/api/sessions/') ? res(500) : res(201, { id: 'A' }))
    );
    vi.stubGlobal('fetch', f);
    expect(await send()).toEqual({ kind: 'SENT', messageId: 'A' });
    const g = vi.fn().mockImplementation((u: string) =>
      String(u).includes('/api/sessions/')
        ? Promise.reject(Object.assign(new Error('t'), { name: 'TimeoutError' }))
        : Promise.resolve(res(201, { id: 'B' }))
    );
    vi.stubGlobal('fetch', g);
    expect(await send()).toEqual({ kind: 'SENT', messageId: 'B' });
  });

  it('timeout default lebih panjang dari jeda tunggu WAHA (~10 dtk)', async () => {
    vi.stubEnv('WAHA_BASE_URL', 'http://waha.test');
    vi.stubEnv('WAHA_TIMEOUT_MS', '');
    const { getWahaConfig } = await import('../wa/waha');
    expect(getWahaConfig()!.timeoutMs).toBeGreaterThan(10_000);
    vi.unstubAllEnvs();
  });

  it('tanpa konfigurasi = FAILED', async () => {
    expect((await sendWhatsAppText(null, '62812', 'x')).kind).toBe('FAILED');
  });

  it('toChatId', () => {
    expect(toChatId('6281')).toBe('6281@c.us');
    expect(toChatId('6281@c.us')).toBe('6281@c.us');
  });
});

describe('getSessionState & wasMessageSent', () => {
  it('status sesi: WORKING ok; SCAN_QR_CODE/FAILED perlu QR; error = tak terjangkau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { status: 'WORKING' })));
    expect(await getSessionState(cfg)).toEqual({ reachable: true, status: 'WORKING', needsQr: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { status: 'SCAN_QR_CODE' })));
    expect(await getSessionState(cfg)).toMatchObject({ needsQr: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { status: 'FAILED' })));
    expect(await getSessionState(cfg)).toMatchObject({ needsQr: true });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr('ECONNREFUSED')));
    expect(await getSessionState(cfg)).toMatchObject({ reachable: false });
  });

  it('wasMessageSent mencocokkan nomor order di pesan keluar sejak waktu tertentu', async () => {
    const since = 1_700_000_000_000;
    const msgs = [
      { body: 'obrolan lain', fromMe: true, timestamp: since / 1000 + 5 },
      { body: 'No. order: PV-1\nlunas', fromMe: true, timestamp: since / 1000 + 10 },
      { body: 'No. order: PV-2', fromMe: true, timestamp: since / 1000 - 9999 }, // terlalu lama
    ];
    const f = vi.fn().mockImplementation(() => Promise.resolve(res(200, msgs)));
    vi.stubGlobal('fetch', f);
    expect(await wasMessageSent(cfg, '6281', 'PV-1', since)).toBe(true);
    expect(await wasMessageSent(cfg, '6281', 'PV-2', since)).toBe(false);
    expect(await wasMessageSent(cfg, '6281', 'PV-3', since)).toBe(false);
    expect(f.mock.calls[0][0]).toContain('/api/default/chats/6281%40c.us/messages?limit=30');
  });

  it('wasMessageSent melempar bila riwayat tak terbaca (jangan dianggap "tidak ada")', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(500)));
    await expect(wasMessageSent(cfg, '6281', 'PV-1', 0)).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { bukan: 'array' })));
    await expect(wasMessageSent(cfg, '6281', 'PV-1', 0)).rejects.toThrow();
  });
});

describe('buildKitchenOrderWhatsAppMessage', () => {
  const order: Order = {
    id: 'o1', token: 't', number: 'PV-20261107-1001', created: 0,
    pickup: Date.UTC(2026, 10, 7, 12, 0), estimate: 10, mode: 'scheduled',
    name: 'Raka', phone: '6281200001111', note: 'jangan pedas',
    payment: 'PAID', fulfillment: 'NEW', notification: 'QUEUED', recipientShiftId: 's1',
    items: [
      { name: 'Indomie Goreng', qty: 2, unit: 14000, egg: true, note: 'tanpa sayur' },
      { name: 'Teh Manis', qty: 1, unit: 5000, temp: 'Dingin' },
    ],
    total: 33000,
  };

  it('memuat semua data wajib FR-32', () => {
    const m = buildKitchenOrderWhatsAppMessage(order, { name: 'Aa Iis' }, { adminUrl: 'https://app.test/' });
    for (const part of [
      'No. order: PV-20261107-1001', 'Pembayaran: LUNAS', 'Pelanggan: Raka', 'WA pelanggan: 6281200001111',
      '7 November 2026', '19.00 WIB', 'terjadwal', '2x Indomie Goreng — dengan telur — Rp28.000',
      'Catatan item: tanpa sayur', '1x Teh Manis — dingin — Rp5.000', 'Catatan order: jangan pedas',
      'Total dibayar: Rp33.000', 'Hubungi pelanggan secara manual', 'Detail admin: https://app.test/admin/antrean',
    ]) expect(m).toContain(part);
    expect(m).not.toContain('KIRIM ULANG');
    expect(m).not.toContain('PERHATIAN');
  });

  it('menandai kirim ulang dan peringatan konfirmasi waktu', () => {
    const m = buildKitchenOrderWhatsAppMessage({ ...order, needsTimeConfirmation: true }, { name: 'Aa Iis' }, { resend: true });
    expect(m.startsWith('[KIRIM ULANG')).toBe(true);
    expect(m).toContain('PERHATIAN: pembayaran masuk terlambat');
  });
});

describe('login WhatsApp dari dashboard', () => {
  it('fetchLoginQr: PNG saat menunggu scan, null bila bukan gambar / ditolak', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const f = vi.fn().mockResolvedValue(new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', f);
    expect(await fetchLoginQr(cfg)).toEqual(png);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://waha.test/api/default/auth/qr');
    expect(init.headers).toMatchObject({ Accept: 'image/png', 'X-Api-Key': 'secret' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { value: 'x' })));
    expect(await fetchLoginQr(cfg)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(422, 'already working')));
    expect(await fetchLoginQr(cfg)).toBeNull();
  });

  it('controlSession: start membuat sesi bila belum ada; error WAHA diteruskan', async () => {
    const f = vi.fn().mockResolvedValueOnce(res(404)).mockResolvedValueOnce(res(201));
    vi.stubGlobal('fetch', f);
    await controlSession(cfg, 'start');
    expect(f.mock.calls.map(([u]) => u)).toEqual([
      'http://waha.test/api/sessions/default/start',
      'http://waha.test/api/sessions',
    ]);
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ name: 'default', start: true });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(500, 'boom')));
    await expect(controlSession(cfg, 'logout')).rejects.toThrow(/500/);
  });

  it('getSessionState menyertakan akun yang login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res(200, { status: 'WORKING', me: { id: '6281234@c.us', pushName: 'Warmindo' } }))
    );
    expect(await getSessionState(cfg)).toEqual({
      reachable: true,
      status: 'WORKING',
      needsQr: false,
      account: { id: '6281234', name: 'Warmindo' },
    });
  });
});
