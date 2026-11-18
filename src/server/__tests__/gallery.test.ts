// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// connection() hanya valid di dalam request Next; di tes dijadikan no-op.
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  connection: async () => {},
}));
import { setDbForTesting, type Db } from '../db';
import { checkGalleryText, normalizeBlockedList } from '../gallery/filter';
import { processGalleryImage } from '../gallery/image';
import { resetGalleryRateLimit, submitGalleryPhoto } from '../gallery/service';
import { saveGallerySettings } from '../repos/gallery';
import { makeTestDb } from './helpers';
import * as listRoute from '@/app/api/gallery/route';
import * as itemRoute from '@/app/api/gallery/[id]/route';
import * as imageRoute from '@/app/api/gallery/[id]/image/route';
import * as adminRoute from '@/app/api/gallery/admin/route';
import * as settingsRoute from '@/app/api/gallery/settings/route';
import { createSessionToken, SESSION_COOKIE } from '../session';

async function jpeg(width = 800, height = 600, color = { r: 200, g: 120, b: 40 }, withGps = false): Promise<Buffer> {
  let img = sharp({ create: { width, height, channels: 3, background: color } }).jpeg();
  if (withGps) {
    img = img.withExif({ IFD0: { Make: 'TestPhone', Copyright: 'rahasia' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '7/1 0/1 0/1' } });
  }
  return img.toBuffer();
}

describe('filter teks galeri', () => {
  it('meloloskan caption wajar, termasuk kata yang mengandung potongan kata terlarang', () => {
    expect(checkGalleryText('Raka', 'Makan indomie habis dari pantai, mantap!').ok).toBe(true);
    expect(checkGalleryText('', 'Cokelat panas paling enak').ok).toBe(true);
  });
  it('menolak kata kasar termasuk variasi leet dan huruf berulang', () => {
    expect(checkGalleryText('', 'dasar anjiiing').ok).toBe(false);
    expect(checkGalleryText('', 'b4ngs4t lu').ok).toBe(false);
    expect(checkGalleryText('k0nt0l', '').ok).toBe(false);
  });
  it('menolak spam judi, link, nomor HP, dan email', () => {
    expect(checkGalleryText('', 'slot gacor hari ini').ok).toBe(false);
    expect(checkGalleryText('', 'cek www.contoh.com').ok).toBe(false);
    expect(checkGalleryText('', 'cek situsku.xyz ya').ok).toBe(false);
    expect(checkGalleryText('', 'wa 0812-3456-7890').ok).toBe(false);
    expect(checkGalleryText('', 'kontak +62 812 345 678').ok).toBe(false);
    expect(checkGalleryText('', 'email aku@mail.com').ok).toBe(false);
  });
  it('memakai kata terlarang tambahan dari admin', () => {
    expect(checkGalleryText('', 'warung sebelah lebih enak', ['sebelah']).ok).toBe(false);
    expect(normalizeBlockedList(['  Sebelah ', 'sebelah', 'x'])).toEqual(['sebelah']);
  });
});

describe('pemrosesan foto', () => {
  it('mengubah ke WebP, memperkecil, dan membuang EXIF/GPS', async () => {
    const input = await jpeg(3000, 2000, undefined, true);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processGalleryImage(input);
    const meta = await sharp(out.full).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width!, meta.height!)).toBe(1600);
    expect(meta.exif).toBeUndefined();
    expect(Math.max((await sharp(out.thumb).metadata()).width!, 0)).toBeLessThanOrEqual(480);
    expect(out.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('menolak berkas bukan gambar, terlalu kecil, dan format lain', async () => {
    await expect(processGalleryImage(Buffer.from('<?php echo 1; ?>'))).rejects.toMatchObject({ status: 400 });
    await expect(processGalleryImage(await jpeg(100, 100))).rejects.toMatchObject({ status: 400 });
    const gif = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#fff' } }).gif().toBuffer();
    await expect(processGalleryImage(gif)).rejects.toMatchObject({ status: 400 });
  });
});

describe('alur galeri (service + API)', () => {
  let db: Db;
  let dir: string;
  const adminCookie = () => `${SESSION_COOKIE}=${createSessionToken()}`;
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

  async function upload(fields: Record<string, string>, file?: Buffer, headers: Record<string, string> = {}) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    if (file) form.set('photo', new File([new Uint8Array(file)], 'foto.jpg', { type: 'image/jpeg' }));
    return listRoute.POST(new Request('http://t/api/gallery', { method: 'POST', body: form, headers }));
  }

  beforeEach(async () => {
    db = await makeTestDb();
    setDbForTesting(db);
    dir = await mkdtemp(path.join(os.tmpdir(), 'galeri-'));
    vi.stubEnv('GALLERY_DIR', dir);
    vi.stubEnv('ADMIN_PASSWORD', 'rahasia-admin-123');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    resetGalleryRateLimit();
  });
  afterEach(async () => {
    setDbForTesting(null);
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it('kiriman masuk antrean, tidak terlihat publik sampai disetujui admin', async () => {
    const res = await upload({ name: 'Raka', caption: 'Nongkrong malam minggu', consent: 'true' }, await jpeg());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ status: 'PENDING' });
    expect(await readdir(dir)).toHaveLength(2);

    const pub = await (await listRoute.GET(new Request('http://t/api/gallery'))).json();
    expect(pub.photos).toHaveLength(0);

    const adm = await (
      await adminRoute.GET(new Request('http://t/api/gallery/admin', { headers: { cookie: adminCookie() } }))
    ).json();
    expect(adm.counts).toEqual({ PENDING: 1, APPROVED: 0 });
    const id = adm.photos[0].id as string;

    // Foto yang menunggu: publik 404, admin bisa melihat.
    expect((await imageRoute.GET(new Request(`http://t/api/gallery/${id}/image`), ctx(id))).status).toBe(404);
    const asAdmin = await imageRoute.GET(
      new Request(`http://t/api/gallery/${id}/image`, { headers: { cookie: adminCookie() } }),
      ctx(id)
    );
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.headers.get('cache-control')).toBe('private, no-store');

    // Tanpa sesi admin: ditolak.
    const noAuth = await itemRoute.PATCH(
      new Request(`http://t/api/gallery/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) }),
      ctx(id)
    );
    expect(noAuth.status).toBe(401);

    const ok = await itemRoute.PATCH(
      new Request(`http://t/api/gallery/${id}`, {
        method: 'PATCH',
        headers: { cookie: adminCookie() },
        body: JSON.stringify({ action: 'approve', caption: 'Nongkrong malam Minggu' }),
      }),
      ctx(id)
    );
    expect(ok.status).toBe(200);
    const pub2 = await (await listRoute.GET(new Request('http://t/api/gallery'))).json();
    expect(pub2.photos).toEqual([expect.objectContaining({ id, name: 'Raka', caption: 'Nongkrong malam Minggu' })]);
    expect(pub2.photos[0]).not.toHaveProperty('flags');
    const thumb = await imageRoute.GET(new Request(`http://t/api/gallery/${id}/image?size=thumb`), ctx(id));
    expect(thumb.status).toBe(200);
    expect(thumb.headers.get('content-type')).toBe('image/webp');

    // Hapus: baris dan berkas hilang.
    const del = await itemRoute.DELETE(
      new Request(`http://t/api/gallery/${id}`, { method: 'DELETE', headers: { cookie: adminCookie() } }),
      ctx(id)
    );
    expect(del.status).toBe(200);
    expect(await readdir(dir)).toHaveLength(0);
  });

  it('menolak tanpa persetujuan, caption terlarang, dan honeypot tidak menyimpan apa pun', async () => {
    expect((await upload({ caption: 'hai' }, await jpeg())).status).toBe(400);
    const bad = await upload({ caption: 'slot gacor', consent: 'true' }, await jpeg());
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/tidak diizinkan/);
    const bot = await upload({ caption: 'hai', consent: 'true', website: 'http://spam' }, await jpeg());
    expect(bot.status).toBe(201);
    expect(await readdir(dir).catch(() => [])).toHaveLength(0);
  });

  it('setujui otomatis: foto bersih langsung tampil, duplikat tetap menunggu dengan tanda', async () => {
    await saveGallerySettings(db, { enabled: true, autoApprove: true, blockedWords: [] });
    const img = await jpeg();
    const a = await submitGalleryPhoto(db, { name: '', caption: 'satu', file: img, ip: '1.1.1.1' });
    expect(a.status).toBe('APPROVED');
    const b = await submitGalleryPhoto(db, { name: '', caption: 'dua', file: img, ip: '2.2.2.2' });
    expect(b.status).toBe('PENDING');
    expect(b.flags).toContain('Foto yang sama pernah dikirim');
  });

  it('form ditutup admin, batas frekuensi per IP', async () => {
    await saveGallerySettings(db, { enabled: false, autoApprove: false, blockedWords: [] });
    await expect(submitGalleryPhoto(db, { name: '', caption: '', file: await jpeg(), ip: 'a' })).rejects.toMatchObject({
      status: 403,
    });
    await saveGallerySettings(db, { enabled: true, autoApprove: false, blockedWords: [] });
    for (let i = 0; i < 5; i++) {
      await submitGalleryPhoto(db, { name: '', caption: `${i}`, file: await jpeg(400, 400, { r: i * 40, g: 0, b: 0 }), ip: 'b' });
    }
    await expect(submitGalleryPhoto(db, { name: '', caption: '', file: await jpeg(), ip: 'b' })).rejects.toMatchObject({
      status: 429,
    });
  });

  it('pengaturan hanya untuk admin dan kata terlarang dinormalisasi', async () => {
    expect((await settingsRoute.GET(new Request('http://t/api/gallery/settings'))).status).toBe(401);
    const res = await settingsRoute.PUT(
      new Request('http://t/api/gallery/settings', {
        method: 'PUT',
        headers: { cookie: adminCookie() },
        body: JSON.stringify({ enabled: true, autoApprove: false, blockedWords: [' Sebelah ', 'SEBELAH'] }),
      })
    );
    expect(await res.json()).toEqual({ enabled: true, autoApprove: false, blockedWords: ['sebelah'] });
  });
});
