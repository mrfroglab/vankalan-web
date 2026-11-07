import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderService } from '../orders';
import { ApiError } from '../client';

const payload = {
  name: 'Raka',
  phone: '6281234567890',
  mode: 'asap' as const,
  pickup: Date.now(),
  estimate: 10,
  items: [{ name: 'Indomie Goreng', qty: 1, unit: 10000 }],
  total: 10000,
};

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );

describe('orderService.createOrder dengan backend aktif', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('meneruskan penolakan 4xx server dan TIDAK membuat order lokal', async () => {
    vi.stubGlobal('fetch', reply(409, { success: false, error: 'Harga berubah.' }));
    const err = await orderService.createOrder(payload).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Harga berubah.');
    expect(localStorage.getItem('pv_orders_v2')).toBeNull();
  });

  it('juga meneruskan error 5xx (mis. gagal memulai pembayaran): tidak membuat order palsu', async () => {
    vi.stubGlobal('fetch', reply(502, { success: false, error: 'Gagal menghubungi layanan pembayaran.' }));
    const err = await orderService.createOrder(payload).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(502);
    expect(localStorage.getItem('pv_orders_v2')).toBeNull();
  });

  it('tetap fallback ke localStorage hanya saat jaringan putus', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const res = await orderService.createOrder(payload);
    expect(res.order.total).toBe(10000);
  });
});

describe('orderService.startPayment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('null saat backend tidak aktif; memanggil endpoint /pay saat aktif', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(await orderService.startPayment('tok')).toBeNull();

    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
    const f = reply(200, { snapToken: 's', redirectUrl: 'u' });
    vi.stubGlobal('fetch', f);
    expect(await orderService.startPayment('a b')).toEqual({ snapToken: 's', redirectUrl: 'u' });
    expect(f.mock.calls[0][0]).toBe('http://api.test/api/orders/token/a%20b/pay');
    expect(f.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });
});
