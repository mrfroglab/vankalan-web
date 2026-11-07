import { describe, expect, it, vi } from 'vitest';
import type { Order } from '@/types';
import { needsHandover, openPaidOrders, runHandover } from '../handover';

const base: Order = {
  id: 'o', token: 't', number: 'PV-1', created: 0, pickup: 1000, estimate: 10, mode: 'asap',
  name: 'Raka', phone: '6281', payment: 'PAID', fulfillment: 'NEW', notification: 'SENT',
  recipientShiftId: 's1', items: [], total: 1000,
};
const o = (over: Partial<Order>): Order => ({ ...base, ...over });

describe('openPaidOrders', () => {
  it('hanya lunas & belum selesai/batal, urut waktu ambil terdekat', () => {
    const list = openPaidOrders([
      o({ id: 'late', pickup: 300 }),
      o({ id: 'done', fulfillment: 'COMPLETED' }),
      o({ id: 'cancelled', fulfillment: 'CANCELLED' }),
      o({ id: 'unpaid', payment: 'PENDING' }),
      o({ id: 'soon', pickup: 100, fulfillment: 'PREPARING' }),
      o({ id: 'ready', pickup: 200, fulfillment: 'READY' }),
    ]);
    expect(list.map((x) => x.id)).toEqual(['soon', 'ready', 'late']);
  });
});

describe('needsHandover', () => {
  it('penerima terakhir penjaga lain → perlu', () => {
    expect(needsHandover(o({ recipientShiftId: 's1' }), 's2')).toBe(true);
  });
  it('penerima sama dan sudah terkirim → tidak perlu', () => {
    expect(needsHandover(o({ recipientShiftId: 's2', notification: 'SENT' }), 's2')).toBe(false);
  });
  it('penerima sama tetapi belum terkonfirmasi terkirim → perlu', () => {
    for (const notification of ['FAILED', 'UNKNOWN', 'QUEUED'] as const) {
      expect(needsHandover(o({ recipientShiftId: 's2', notification }), 's2')).toBe(true);
    }
  });
});

describe('runHandover', () => {
  it('menghitung terkirim dan mengumpulkan yang belum beres; satu gagal tidak menghentikan lainnya', async () => {
    const orders = [o({ id: 'a', number: 'PV-A' }), o({ id: 'b', number: 'PV-B' }), o({ id: 'c', number: 'PV-C' }), o({ id: 'd', number: 'PV-D' })];
    const resend = vi.fn(async (id: string): Promise<Order> => {
      if (id === 'a') return o({ id, notification: 'SENT' });
      if (id === 'b') return o({ id, notification: 'UNKNOWN' });
      if (id === 'c') throw new Error('Notifikasi sedang dikirim.');
      return o({ id, notification: 'FAILED', notificationDetail: { jobStatus: 'QUEUED', attempts: 1, maxAttempts: 4, lastError: 'WAHA tidak dapat dihubungi.' } });
    });
    const s = await runHandover(orders, resend);
    expect(resend.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c', 'd']); // berurutan
    expect(s).toMatchObject({ total: 4, sent: 1 });
    expect(s.unresolved).toEqual([
      { orderId: 'b', number: 'PV-B', reason: 'Hasil pengiriman belum pasti; cek WhatsApp.' },
      { orderId: 'c', number: 'PV-C', reason: 'Notifikasi sedang dikirim.' },
      { orderId: 'd', number: 'PV-D', reason: 'WAHA tidak dapat dihubungi.' },
    ]);
  });

  it('daftar kosong → tidak memanggil apa pun', async () => {
    const resend = vi.fn();
    expect(await runHandover([], resend)).toEqual({ total: 0, sent: 0, unresolved: [] });
    expect(resend).not.toHaveBeenCalled();
  });
});
