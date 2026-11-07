// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// connection() hanya valid di dalam request Next; di tes dijadikan no-op.
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));

import { setDbForTesting } from '../db';
import { makeTestDb } from './helpers';
import * as ordersRoute from '@/app/api/orders/route';
import * as menuRoute from '@/app/api/menu/route';
import * as settingsRoute from '@/app/api/settings/route';
import * as shiftsRoute from '@/app/api/shifts/route';
import * as paymentRoute from '@/app/api/orders/[id]/payment/route';
import * as tokenRoute from '@/app/api/orders/token/[token]/route';
import * as seedRoute from '@/app/api/orders/seed/route';

const req = (method: string, body?: unknown) =>
  new Request('http://test/api', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;

const good = () => ({
  name: 'Raka',
  phone: '081234567890',
  mode: 'asap',
  pickup: Date.now(),
  estimate: 10,
  items: [{ name: 'Indomie Goreng', qty: 1, unit: 10000 }],
  total: 10000,
});

describe('API routes', () => {
  beforeAll(() => {
    vi.stubEnv('NODE_ENV', 'test');
  });
  beforeEach(async () => {
    setDbForTesting(await makeTestDb());
  });
  afterEach(() => {
    setDbForTesting(null);
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('GET /api/menu & /api/settings publik', async () => {
    const menu = await (await menuRoute.GET()).json();
    expect(menu.length).toBeGreaterThan(5);
    const settings = await (await settingsRoute.GET()).json();
    expect(settings).toMatchObject({ open: true, estimate: 10, eggPrice: 4000 });
  });

  it('POST /api/orders: 201 + nomor WA dinormalisasi + tanpa snapToken', async () => {
    const res = await ordersRoute.POST(req('POST', good()));
    expect(res.status).toBe(201);
    const { order } = await res.json();
    expect(order.phone).toBe('6281234567890');
    expect(order.payment).toBe('PENDING');
    const track = await tokenRoute.GET(req('GET'), ctx({ token: order.token }));
    expect(track.status).toBe(200);
    expect((await tokenRoute.GET(req('GET'), ctx({ token: 'nope' }))).status).toBe(404);
  });

  it('POST /api/orders: 400 untuk JSON rusak, nomor tak valid, qty negatif', async () => {
    expect((await ordersRoute.POST(req('POST', '{bukan json'))).status).toBe(400);
    expect((await ordersRoute.POST(req('POST', { ...good(), phone: '123' }))).status).toBe(400);
    const neg = { ...good(), items: [{ name: 'Indomie Goreng', qty: -1, unit: 10000 }] };
    expect((await ordersRoute.POST(req('POST', neg))).status).toBe(400);
  });

  it('POST /api/orders: 409 + kode untuk total dimanipulasi', async () => {
    const res = await ordersRoute.POST(req('POST', { ...good(), total: 1 }));
    expect(res.status).toBe(409);
    expect((await res.json()).details.code).toBe('PRICE_CHANGED');
  });

  it('PUT /api/menu menolak nama duplikat; menerima menu valid', async () => {
    const menu = await (await menuRoute.GET()).json();
    const dup = [menu[0], { ...menu[1], name: menu[0].name }];
    expect((await menuRoute.PUT(req('PUT', { items: dup }))).status).toBe(400);
    expect((await menuRoute.PUT(req('PUT', { items: menu }))).status).toBe(200);
    expect((await menuRoute.PUT(req('PUT', { items: [] }))).status).toBe(400);
  });

  it('PATCH /api/settings menolak sif tak dikenal & nilai negatif', async () => {
    expect((await settingsRoute.PATCH(req('PATCH', { recipientShiftId: 'x' }))).status).toBe(400);
    expect((await settingsRoute.PATCH(req('PATCH', { estimate: -5 }))).status).toBe(400);
    const ok = await settingsRoute.PATCH(req('PATCH', { open: false, recipientShiftId: 's2' }));
    expect(await ok.json()).toMatchObject({ open: false, recipientShiftId: 's2' });
  });

  it('simulasi pembayaran 403 secara default, bisa dibuka eksplisit di dev', async () => {
    const { order } = await (await ordersRoute.POST(req('POST', good()))).json();
    const attempt = () => paymentRoute.PATCH(req('PATCH', { payment: 'PAID' }), ctx({ id: order.id }));
    expect((await attempt()).status).toBe(403);

    vi.stubEnv('ALLOW_PAYMENT_SIMULATION', 'true');
    vi.stubEnv('WAHA_BASE_URL', ''); // WA tidak terkonfigurasi => FAILED, bukan crash
    const res = await attempt();
    expect(res.status).toBe(200);
    const paid = await res.json();
    expect(paid.payment).toBe('PAID');
    expect(paid.notification).toBe('FAILED');
  });

  it('production: endpoint admin 503, simulasi & seed terkunci, endpoint publik tetap jalan', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_PAYMENT_SIMULATION', 'true');
    expect((await shiftsRoute.GET(req('GET'))).status).toBe(503);
    expect((await ordersRoute.GET(req('GET'))).status).toBe(503);
    expect((await menuRoute.PUT(req('PUT', { items: [] }))).status).toBe(503);
    expect((await seedRoute.POST(req('POST'))).status).toBe(503);
    expect((await menuRoute.GET()).status).toBe(200);
    expect((await ordersRoute.POST(req('POST', good()))).status).toBe(201);
  });
});
