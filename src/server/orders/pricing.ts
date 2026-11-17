/**
 * Logika murni (tanpa I/O) untuk menghitung ulang harga dan memvalidasi waktu ambil
 * di server. Klien TIDAK dipercaya untuk nominal: semua harga diturunkan dari menu
 * di database + pengaturan toko (PRD FR-08, 14.1, 14.2).
 */

import type { MenuItem, OrderItem, StoreSettings } from '@/types';
import { HttpError } from '../http';

export const MAX_PICKUP_AHEAD_MS = 60 * 60 * 1000; // PRD: maksimal 1 jam ke depan
/** Toleransi jam tersangkut di sisi klien saat memilih slot terdekat. */
export const PICKUP_CLOCK_SKEW_MS = 60 * 1000;
export const MAX_QTY_PER_ITEM = 50;
export const MAX_ITEMS_PER_ORDER = 30;

export type OrderErrorCode =
  | 'STORE_CLOSED'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_UNAVAILABLE'
  | 'INVALID_OPTION'
  | 'PRICE_CHANGED'
  | 'ESTIMATE_CHANGED'
  | 'PICKUP_OUT_OF_RANGE'
  | 'CHECKOUT_PAUSED';

function fail(status: number, code: OrderErrorCode, message: string, extra?: object): never {
  throw new HttpError(status, message, { code, ...extra });
}

export interface PricedOrder {
  items: OrderItem[];
  total: number;
}

export function priceItems(
  requested: OrderItem[],
  menu: MenuItem[],
  eggPrice: number
): PricedOrder {
  if (requested.length === 0) {
    throw new HttpError(400, 'Keranjang kosong.');
  }
  if (requested.length > MAX_ITEMS_PER_ORDER) {
    throw new HttpError(400, `Maksimal ${MAX_ITEMS_PER_ORDER} baris item per pesanan.`);
  }

  const byName = new Map(menu.map((m) => [m.name, m]));
  const items: OrderItem[] = [];
  let total = 0;

  for (const req of requested) {
    if (!Number.isInteger(req.qty) || req.qty < 1 || req.qty > MAX_QTY_PER_ITEM) {
      throw new HttpError(400, `Jumlah untuk "${req.name}" harus 1–${MAX_QTY_PER_ITEM}.`);
    }

    const menuItem = byName.get(req.name);
    if (!menuItem) {
      fail(409, 'ITEM_NOT_FOUND', `Menu "${req.name}" tidak ditemukan. Mohon tinjau keranjang.`, {
        item: req.name,
      });
    }
    if (!menuItem.available) {
      fail(409, 'ITEM_UNAVAILABLE', `"${menuItem.name}" sedang habis. Mohon tinjau keranjang.`, {
        item: menuItem.name,
      });
    }

    const wantsEgg = Boolean(req.egg);
    if (wantsEgg && !menuItem.egg) {
      fail(400, 'INVALID_OPTION', `"${menuItem.name}" tidak punya pilihan telur.`, {
        item: menuItem.name,
      });
    }

    if (req.temp) {
      const allowed = menuItem.temperatures ?? [];
      if (!allowed.includes(req.temp)) {
        fail(400, 'INVALID_OPTION', `Pilihan ${req.temp} tidak tersedia untuk "${menuItem.name}".`, {
          item: menuItem.name,
        });
      }
    } else if (menuItem.temperatures && menuItem.temperatures.length > 0) {
      fail(400, 'INVALID_OPTION', `Pilih panas/dingin untuk "${menuItem.name}".`, {
        item: menuItem.name,
      });
    }

    let unit = menuItem.price;
    if (wantsEgg) unit += eggPrice;
    if (req.temp === 'Dingin' && menuItem.coldExtra) unit += menuItem.coldExtra;

    const note = req.note?.trim();
    items.push({
      name: menuItem.name,
      qty: req.qty,
      unit,
      ...(wantsEgg ? { egg: true } : {}),
      ...(req.temp ? { temp: req.temp } : {}),
      ...(note ? { note: note.slice(0, 200) } : {}),
    });
    total += unit * req.qty;
  }

  return { items, total };
}

/** Bandingkan hasil hitung server dengan yang dilihat pelanggan; beda = minta tinjau ulang. */
export function assertPriceMatches(
  server: PricedOrder,
  clientTotal: number,
  clientItems: OrderItem[]
): void {
  const sameUnits =
    server.items.length === clientItems.length &&
    server.items.every((it, i) => it.unit === clientItems[i].unit && it.qty === clientItems[i].qty);
  if (server.total !== clientTotal || !sameUnits) {
    fail(
      409,
      'PRICE_CHANGED',
      'Harga berubah sejak item masuk keranjang. Mohon tinjau pesanan sebelum membayar.',
      { serverTotal: server.total, items: server.items }
    );
  }
}

export interface PickupInput {
  mode: 'asap' | 'scheduled';
  /** epoch ms yang dipilih pelanggan (diabaikan untuk mode asap). */
  pickup: number;
  clientEstimate: number;
}

export function resolvePickup(
  input: PickupInput,
  settings: Pick<StoreSettings, 'open' | 'estimate'>,
  now: number
): number {
  if (!settings.open) {
    fail(409, 'STORE_CLOSED', 'Toko online sedang tutup.');
  }

  const estimateMs = settings.estimate * 60 * 1000;
  if (estimateMs > MAX_PICKUP_AHEAD_MS) {
    fail(
      409,
      'CHECKOUT_PAUSED',
      'Antrean sedang panjang. Checkout dijeda sementara sampai estimasi di bawah 1 jam.'
    );
  }

  if (input.clientEstimate !== settings.estimate) {
    fail(
      409,
      'ESTIMATE_CHANGED',
      'Estimasi persiapan berubah. Mohon konfirmasi ulang waktu ambil.',
      { estimate: settings.estimate }
    );
  }

  if (input.mode === 'asap') {
    return now + estimateMs;
  }

  const min = now + estimateMs - PICKUP_CLOCK_SKEW_MS;
  const max = now + MAX_PICKUP_AHEAD_MS + PICKUP_CLOCK_SKEW_MS;
  if (!Number.isFinite(input.pickup) || input.pickup < min || input.pickup > max) {
    fail(
      409,
      'PICKUP_OUT_OF_RANGE',
      'Waktu ambil di luar rentang yang diizinkan (estimasi sampai 1 jam ke depan).',
      { minPickup: now + estimateMs, maxPickup: now + MAX_PICKUP_AHEAD_MS }
    );
  }
  return input.pickup;
}

/** Tanggal WIB (YYYYMMDD) dari epoch ms, dipakai untuk nomor order harian. */
export function wibDayKey(now: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(now))
    .replace(/-/g, '');
}
