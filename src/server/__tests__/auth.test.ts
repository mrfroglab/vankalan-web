// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));

import { NextRequest } from 'next/server';
import { requireAdmin } from '../auth';
import { _clearRateLimits } from '../rateLimit';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readCookie,
  safeNextPath,
  verifyPassword,
  verifySessionToken,
} from '../session';
import { proxy } from '@/proxy';
import { setDbForTesting } from '../db';
import { makeTestDb } from './helpers';
import * as login from '@/app/api/auth/login/route';
import * as logout from '@/app/api/auth/logout/route';
import * as sessionRoute from '@/app/api/auth/session/route';
import * as ordersRoute from '@/app/api/orders/route';

const SECRET = 'x'.repeat(40);
const PASS = 'warmindo-rahasia';

const configure = () => {
  vi.stubEnv('ADMIN_PASSWORD', PASS);
  vi.stubEnv('SESSION_SECRET', SECRET);
};
const cookieHeader = (token: string) => `other=1; ${SESSION_COOKIE}=${token}`;
const req = (method: string, init: { cookie?: string; origin?: string; body?: unknown; ip?: string } = {}) =>
  new Request('http://app.test/api/x', {
    method,
    headers: {
      host: 'app.test',
      'content-type': 'application/json',
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...(init.origin ? { origin: init.origin } : {}),
      ...(init.ip ? { 'x-forwarded-for': init.ip } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const status = (fn: () => void) => {
  try {
    fn();
    return 200;
  } catch (e) {
    return (e as { status: number }).status;
  }
};

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  _clearRateLimits();
});
afterEach(() => vi.unstubAllEnvs());

describe('session token', () => {
  beforeEach(configure);

  it('token valid lolos; kedaluwarsa, dirusak, dan kunci lain ditolak', () => {
    const now = Date.UTC(2026, 10, 7);
    const t = createSessionToken(now);
    expect(verifySessionToken(t, now + 1000)).toBe(true);
    expect(verifySessionToken(t, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBe(false);

    const [payload, mac] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, exp: 9_999_999_999 })).toString('base64url');
    expect(verifySessionToken(`${forged}.${mac}`)).toBe(false);
    expect(verifySessionToken(`${payload}.${mac}x`)).toBe(false);
    expect(verifySessionToken(payload)).toBe(false);
    expect(verifySessionToken('')).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);

    vi.stubEnv('SESSION_SECRET', 'y'.repeat(40)); // rotasi kunci membatalkan sesi
    expect(verifySessionToken(t, now + 1000)).toBe(false);
  });

  it('SESSION_SECRET pendek dianggap tidak terkonfigurasi', () => {
    vi.stubEnv('SESSION_SECRET', 'pendek');
    expect(() => createSessionToken()).toThrow();
    expect(verifySessionToken('a.b')).toBe(false);
  });

  it('verifyPassword, readCookie, safeNextPath', () => {
    expect(verifyPassword(PASS)).toBe(true);
    expect(verifyPassword(PASS + 'x')).toBe(false);
    expect(verifyPassword('')).toBe(false);
    expect(readCookie('a=1; pv_admin=tok; b=2', 'pv_admin')).toBe('tok');
    expect(readCookie(null, 'pv_admin')).toBeUndefined();
    expect(safeNextPath('/admin/menu')).toBe('/admin/menu');
    expect(safeNextPath('/admin')).toBe('/admin');
    expect(safeNextPath('/admin/sif/')).toBe('/admin/sif/');
    for (const bad of ['//evil.com', 'https://evil.com', '/admin/../x?y', '/other', '/admin//evil', '/admin/../x', '/admin/./x', '/admin/a b', null, '']) {
      expect(safeNextPath(bad as string | null)).toBe('/admin/antrean');
    }
  });
});

describe('requireAdmin', () => {
  it('belum terkonfigurasi: dev terbuka, production fail-closed 503', () => {
    expect(status(() => requireAdmin(req('GET')))).toBe(200);
    vi.stubEnv('NODE_ENV', 'production');
    expect(status(() => requireAdmin(req('GET')))).toBe(503);
  });

  it('terkonfigurasi: tanpa/ dengan cookie salah 401, cookie valid lolos', () => {
    configure();
    expect(status(() => requireAdmin(req('GET')))).toBe(401);
    expect(status(() => requireAdmin(req('GET', { cookie: cookieHeader('a.b') })))).toBe(401);
    expect(status(() => requireAdmin(req('GET', { cookie: cookieHeader(createSessionToken()) })))).toBe(200);
  });

  it('terkonfigurasi: POST lintas-origin ditolak walau cookie valid', () => {
    configure();
    const cookie = cookieHeader(createSessionToken());
    expect(status(() => requireAdmin(req('POST', { cookie, origin: 'https://evil.example' })))).toBe(403);
    expect(status(() => requireAdmin(req('POST', { cookie, origin: 'http://app.test' })))).toBe(200);
    expect(status(() => requireAdmin(req('POST', { cookie })))).toBe(200); // klien non-browser
    expect(status(() => requireAdmin(req('GET', { cookie, origin: 'https://evil.example' })))).toBe(200);
  });
});

describe('/api/auth', () => {
  it('login: 503 bila belum terkonfigurasi', async () => {
    expect((await login.POST(req('POST', { body: { password: PASS } }))).status).toBe(503);
  });

  it('login sukses menyetel cookie httpOnly + SameSite=Strict; logout menghapusnya', async () => {
    configure();
    vi.stubEnv('NODE_ENV', 'production');
    const res = await login.POST(req('POST', { body: { password: PASS } }));
    expect(res.status).toBe(200);
    const set = res.headers.get('set-cookie')!;
    expect(set).toContain(`${SESSION_COOKIE}=`);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=strict/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/Max-Age=43200/i);

    const out = await logout.POST();
    expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });

  it('login gagal 401 generik; 5 gagal berturut-turut → 429 + Retry-After; IP lain tidak terdampak', async () => {
    configure();
    const bad = (ip: string) => login.POST(req('POST', { ip, body: { password: 'salah' } }));
    for (let i = 0; i < 5; i++) expect((await bad('1.1.1.1')).status).toBe(401);
    const blocked = await bad('1.1.1.1');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    // kata sandi benar pun ditolak saat diblokir
    expect((await login.POST(req('POST', { ip: '1.1.1.1', body: { password: PASS } }))).status).toBe(429);
    expect((await login.POST(req('POST', { ip: '2.2.2.2', body: { password: PASS } }))).status).toBe(200);
  });

  it('login menolak body rusak / kosong', async () => {
    configure();
    expect((await login.POST(req('POST', { body: {} }))).status).toBe(400);
    const raw = new Request('http://app.test/api/auth/login', { method: 'POST', body: '{x' });
    expect((await login.POST(raw)).status).toBe(400);
  });

  it('session mencerminkan status', async () => {
    expect(await (await sessionRoute.GET(req('GET'))).json()).toEqual({ configured: false, authenticated: false });
    configure();
    expect(await (await sessionRoute.GET(req('GET'))).json()).toEqual({ configured: true, authenticated: false });
    const cookie = cookieHeader(createSessionToken());
    expect(await (await sessionRoute.GET(req('GET', { cookie }))).json()).toEqual({ configured: true, authenticated: true });
  });

  it('endpoint admin sungguhan: 401 tanpa sesi, 200 dengan sesi', async () => {
    setDbForTesting(await makeTestDb());
    configure();
    expect((await ordersRoute.GET(req('GET'))).status).toBe(401);
    const cookie = cookieHeader(createSessionToken());
    expect((await ordersRoute.GET(req('GET', { cookie }))).status).toBe(200);
    setDbForTesting(null);
  });
});

describe('proxy (/admin/*)', () => {
  const page = (path: string, token?: string) =>
    new NextRequest(`http://app.test${path}`, {
      headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
    });
  const isRedirect = (r: Response) => r.status >= 300 && r.status < 400;

  it('terkonfigurasi: tanpa sesi → redirect ke login membawa next; dengan sesi lolos; login selalu lolos', () => {
    configure();
    const r = proxy(page('/admin/menu?tab=1'));
    expect(isRedirect(r)).toBe(true);
    const loc = new URL(r.headers.get('location')!);
    expect(loc.pathname).toBe('/admin/login');
    expect(loc.searchParams.get('next')).toBe('/admin/menu?tab=1');

    expect(isRedirect(proxy(page('/admin/menu', createSessionToken())))).toBe(false);
    expect(isRedirect(proxy(page('/admin/login')))).toBe(false);
    expect(isRedirect(proxy(page('/admin/menu', 'a.b')))).toBe(true);
  });

  it('belum terkonfigurasi: dev lolos, production fail-closed', () => {
    expect(isRedirect(proxy(page('/admin/antrean')))).toBe(false);
    vi.stubEnv('NODE_ENV', 'production');
    expect(isRedirect(proxy(page('/admin/antrean')))).toBe(true);
  });
});
