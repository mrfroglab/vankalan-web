// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { INITIAL_MENU } from '@/lib/constants';
import { HttpError } from '../http';
import {
  assertPriceMatches,
  priceItems,
  resolvePickup,
  wibDayKey,
} from '../orders/pricing';

const EGG = 4000;
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as HttpError & { details?: { code?: string } }).details?.code ?? `HTTP_${(e as HttpError).status}`;
  }
  return 'NO_ERROR';
};

describe('priceItems', () => {
  it('menghitung telur dan tambahan dingin dari menu server', () => {
    const r = priceItems(
      [
        { name: 'Indomie Goreng', qty: 2, unit: 1, egg: true },
        { name: 'Teh Manis', qty: 1, unit: 1, temp: 'Dingin' },
      ],
      INITIAL_MENU,
      EGG
    );
    expect(r.items.map((i) => i.unit)).toEqual([14000, 5000]);
    expect(r.total).toBe(14000 * 2 + 5000);
  });

  it('mengabaikan unit dari klien', () => {
    const r = priceItems([{ name: 'Indomie Goreng', qty: 1, unit: 1 }], INITIAL_MENU, EGG);
    expect(r.total).toBe(10000);
  });

  it('menolak menu habis, tidak dikenal, telur di menu tanpa telur, dan temp tak valid', () => {
    const p = (item: object) => () =>
      priceItems([{ qty: 1, unit: 0, ...item } as never], INITIAL_MENU, EGG);
    expect(code(p({ name: 'Jeruk Segar', temp: 'Dingin' }))).toBe('ITEM_UNAVAILABLE');
    expect(code(p({ name: 'Menu Siluman' }))).toBe('ITEM_NOT_FOUND');
    expect(code(p({ name: 'Nasi Telur Warmindo', egg: true }))).toBe('INVALID_OPTION');
    expect(code(p({ name: 'Teh Manis' }))).toBe('INVALID_OPTION'); // wajib pilih panas/dingin
    expect(code(p({ name: 'Indomie Goreng', temp: 'Panas' }))).toBe('INVALID_OPTION');
  });

  it('menolak qty tidak wajar dan keranjang kosong', () => {
    const q = (qty: number) => () =>
      priceItems([{ name: 'Indomie Goreng', qty, unit: 0 }], INITIAL_MENU, EGG);
    expect(code(q(0))).toBe('HTTP_400');
    expect(code(q(-1))).toBe('HTTP_400');
    expect(code(q(1.5))).toBe('HTTP_400');
    expect(code(q(51))).toBe('HTTP_400');
    expect(code(() => priceItems([], INITIAL_MENU, EGG))).toBe('HTTP_400');
  });
});

describe('assertPriceMatches', () => {
  const items = [{ name: 'Indomie Goreng', qty: 1, unit: 10000 }];
  const server = { items, total: 10000 };
  it('lolos bila sama', () => expect(code(() => assertPriceMatches(server, 10000, items))).toBe('NO_ERROR'));
  it('PRICE_CHANGED bila total dimanipulasi', () =>
    expect(code(() => assertPriceMatches(server, 1, items))).toBe('PRICE_CHANGED'));
  it('PRICE_CHANGED bila unit dimanipulasi', () =>
    expect(code(() => assertPriceMatches(server, 10000, [{ ...items[0], unit: 1 }]))).toBe('PRICE_CHANGED'));
});

describe('resolvePickup', () => {
  const now = Date.UTC(2026, 10, 7, 5, 0, 0);
  const min = 60 * 1000;
  const open = { open: true, estimate: 10 };
  const base = { mode: 'scheduled' as const, pickup: now + 20 * min, clientEstimate: 10 };

  it('asap = sekarang + estimasi server', () =>
    expect(resolvePickup({ ...base, mode: 'asap', pickup: 0 }, open, now)).toBe(now + 10 * min));
  it('scheduled dalam rentang diterima', () =>
    expect(resolvePickup(base, open, now)).toBe(now + 20 * min));
  it('toko tutup ditolak', () =>
    expect(code(() => resolvePickup(base, { ...open, open: false }, now))).toBe('STORE_CLOSED'));
  it('terlalu cepat / lewat 1 jam / NaN ditolak', () => {
    expect(code(() => resolvePickup({ ...base, pickup: now + 2 * min }, open, now))).toBe('PICKUP_OUT_OF_RANGE');
    expect(code(() => resolvePickup({ ...base, pickup: now + 90 * min }, open, now))).toBe('PICKUP_OUT_OF_RANGE');
    expect(code(() => resolvePickup({ ...base, pickup: NaN }, open, now))).toBe('PICKUP_OUT_OF_RANGE');
  });
  it('estimasi berubah diminta konfirmasi ulang', () =>
    expect(code(() => resolvePickup({ ...base, clientEstimate: 5 }, open, now))).toBe('ESTIMATE_CHANGED'));
  it('estimasi > 1 jam menjeda checkout', () =>
    expect(code(() => resolvePickup({ ...base, clientEstimate: 75 }, { open: true, estimate: 75 }, now))).toBe('CHECKOUT_PAUSED'));
});

describe('wibDayKey', () => {
  it('memakai tanggal WIB, bukan UTC', () => {
    // 2026-11-07 18:00 UTC = 2026-11-08 01:00 WIB
    expect(wibDayKey(Date.UTC(2026, 10, 7, 18, 0, 0))).toBe('20261108');
  });
});
