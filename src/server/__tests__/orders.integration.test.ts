// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateOrderPayload } from '@/types';
import type { Db } from '../db';
import {
  cancelOrder,
  createOrder,
  getOrderByToken,
  listOrders,
  recordRefund,
  setPayment,
  updateFulfillment,
} from '../repos/orders';
import { getSettings, patchSettings, replaceMenu, replaceShifts, listMenu } from '../repos/settings';
import { INITIAL_MENU } from '@/lib/constants';
import { makeTestDb } from './helpers';

const NOW = Date.UTC(2026, 10, 7, 5, 0, 0); // 12:00 WIB
const MIN = 60 * 1000;

const payload = (over: Partial<CreateOrderPayload> = {}): CreateOrderPayload => ({
  name: 'Raka',
  phone: '6281234567890',
  mode: 'asap',
  pickup: NOW + 10 * MIN,
  estimate: 10,
  items: [
    { name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true },
    { name: 'Teh Manis', qty: 2, unit: 5000, temp: 'Dingin', note: 'less sugar' },
  ],
  total: 24000,
  ...over,
});

describe('orders repo (Postgres)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it('membuat order dengan item, nomor harian berurutan (WIB), dan token acak', async () => {
    const a = await createOrder(db, payload(), NOW);
    const b = await createOrder(db, payload(), NOW);
    expect(a.number).toBe('PV-20261107-1001');
    expect(b.number).toBe('PV-20261107-1002');
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(24);
    expect(a.payment).toBe('PENDING');
    expect(a.fulfillment).toBe('NEW');
    expect(a.items).toEqual([
      { name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true },
      { name: 'Teh Manis', qty: 2, unit: 5000, temp: 'Dingin', note: 'less sugar' },
    ]);
    expect(a.pickup).toBe(NOW + 10 * MIN);
    expect(a.recipientShiftId).toBe('s1');
  });

  it('nomor order tidak bentrok pada pembuatan paralel', async () => {
    const orders = await Promise.all(Array.from({ length: 8 }, () => createOrder(db, payload(), NOW)));
    expect(new Set(orders.map((o) => o.number)).size).toBe(8);
  });

  it('menolak total yang dimanipulasi dan tidak menyimpan apa pun', async () => {
    await expect(createOrder(db, payload({ total: 100 }), NOW)).rejects.toMatchObject({
      status: 409,
      details: { code: 'PRICE_CHANGED', serverTotal: 24000 },
    });
    expect(await listOrders(db)).toHaveLength(0);
  });

  it('mendeteksi harga menu berubah sejak masuk keranjang', async () => {
    const menu = await listMenu(db);
    await replaceMenu(db, menu.map((m) => (m.name === 'Indomie Goreng' ? { ...m, price: 12000 } : m)));
    await expect(createOrder(db, payload(), NOW)).rejects.toMatchObject({
      details: { code: 'PRICE_CHANGED' },
    });
  });

  it('menolak saat toko tutup walau tombol browser dimanipulasi', async () => {
    await patchSettings(db, { open: false });
    await expect(createOrder(db, payload(), NOW)).rejects.toMatchObject({
      details: { code: 'STORE_CLOSED' },
    });
  });

  it('memakai estimasi server untuk pickup asap dan menolak estimasi basi', async () => {
    await patchSettings(db, { estimate: 20 });
    await expect(createOrder(db, payload(), NOW)).rejects.toMatchObject({
      details: { code: 'ESTIMATE_CHANGED', estimate: 20 },
    });
    const o = await createOrder(db, payload({ estimate: 20 }), NOW);
    expect(o.pickup).toBe(NOW + 20 * MIN);
  });

  it('penerima ditentukan server, bukan klien; tanpa penjaga checkout ditutup', async () => {
    await patchSettings(db, { recipientShiftId: 's2' });
    const o = await createOrder(db, { ...payload(), recipientShiftId: 's1' }, NOW);
    expect(o.recipientShiftId).toBe('s2');
    await replaceShifts(db, []);
    await expect(createOrder(db, payload(), NOW)).rejects.toMatchObject({ status: 409 });
  });

  it('replaceShifts memindahkan penerima aktif bila sif-nya dihapus', async () => {
    await replaceShifts(db, [{ id: 's9', name: 'Baru', phone: '6281111111111' }]);
    expect((await getSettings(db)).recipientShiftId).toBe('s9');
  });

  it('pelacakan lewat token: token salah tidak membuka order lain', async () => {
    const o = await createOrder(db, payload(), NOW);
    expect((await getOrderByToken(db, o.token))?.id).toBe(o.id);
    expect(await getOrderByToken(db, o.token + 'x')).toBeNull();
    expect(await getOrderByToken(db, '')).toBeNull();
  });

  it('pembayaran PAID: mengisi paidAt, menghitung ulang pickup asap, idempoten', async () => {
    const o = await createOrder(db, payload(), NOW);
    const paid = await setPayment(db, o.id, 'PAID', NOW + 5 * MIN);
    expect(paid.payment).toBe('PAID');
    expect(paid.paidAt).toBe(NOW + 5 * MIN);
    expect(paid.pickup).toBe(NOW + 15 * MIN);
    const again = await setPayment(db, o.id, 'PAID', NOW + 99 * MIN);
    expect(again.paidAt).toBe(NOW + 5 * MIN); // tidak berubah
    await expect(setPayment(db, o.id, 'FAILED')).rejects.toMatchObject({ status: 409 });
  });

  it('pesanan belum lunas tidak bisa diproses; selesai = final', async () => {
    const o = await createOrder(db, payload(), NOW);
    await expect(updateFulfillment(db, o.id, 'PREPARING')).rejects.toMatchObject({ status: 409 });
    await setPayment(db, o.id, 'PAID', NOW);
    await updateFulfillment(db, o.id, 'PREPARING');
    const done = await updateFulfillment(db, o.id, 'COMPLETED', NOW + 20 * MIN);
    expect(done.completedAt).toBe(NOW + 20 * MIN);
    await expect(updateFulfillment(db, o.id, 'NEW')).rejects.toMatchObject({ status: 409 });
    await expect(updateFulfillment(db, o.id, 'CANCELLED')).rejects.toMatchObject({ status: 400 });
  });

  it('batal: refund PENDING hanya bila sudah dibayar', async () => {
    const unpaid = await createOrder(db, payload(), NOW);
    const c1 = await cancelOrder(db, unpaid.id, 'salah pesan');
    expect(c1.fulfillment).toBe('CANCELLED');
    expect(c1.refund).toBeUndefined();

    const paid = await createOrder(db, payload(), NOW);
    await setPayment(db, paid.id, 'PAID', NOW);
    const c2 = await cancelOrder(db, paid.id, 'stok habis');
    expect(c2.refund).toMatchObject({ status: 'PENDING', amount: 24000, reason: 'stok habis' });
    await expect(cancelOrder(db, paid.id, 'lagi')).rejects.toMatchObject({ status: 409 });
  });

  it('refund: wajib lunas, tidak boleh melebihi total, tercatat terpisah', async () => {
    const o = await createOrder(db, payload(), NOW);
    await expect(
      recordRefund(db, o.id, { status: 'FULL_REFUNDED', amount: 1, reason: '' })
    ).rejects.toMatchObject({ status: 409 });
    await setPayment(db, o.id, 'PAID', NOW);
    await expect(
      recordRefund(db, o.id, { status: 'FULL_REFUNDED', amount: 24001, reason: '' })
    ).rejects.toMatchObject({ status: 400 });
    const r = await recordRefund(
      db, o.id, { status: 'PARTIAL_REFUNDED', amount: 5000, reason: 'teh tumpah' }, NOW
    );
    expect(r.refund).toMatchObject({ status: 'PARTIAL_REFUNDED', amount: 5000, confirmedAt: NOW });
    expect(r.payment).toBe('PAID'); // pembayaran tidak berubah
  });

  it('PUT menu mempertahankan urutan dan round-trip field opsional', async () => {
    const saved = await replaceMenu(db, INITIAL_MENU);
    expect(saved.map((m) => m.id)).toEqual(INITIAL_MENU.map((m) => m.id));
    const tea = saved.find((m) => m.name === 'Teh Manis')!;
    expect(tea).toMatchObject({ temperatures: ['Panas', 'Dingin'], coldExtra: 1000, available: true });
    expect(saved.find((m) => m.name === 'Jeruk Segar')!.available).toBe(false);
  });
});
