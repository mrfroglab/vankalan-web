import { Order, Shift } from '@/types';
import { formatTimeWIB, formatRupiah, TIMEZONE } from '@/lib/constants';

function formatLongDateWIB(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export interface KitchenMessageOptions {
  /** Pesan dikirim ulang manual (ditandai agar tidak dikira order baru). */
  resend?: boolean;
  adminUrl?: string;
}

/**
 * Pesan notifikasi untuk penjaga (format mengikuti PRD 8.3). Dipakai server (kirim) dan
 * browser (pratinjau di admin), jadi harus murni. Nomor order selalu ada agar penjaga bisa
 * mengenali pesan ganda bila pengiriman ulang terjadi.
 */
export function buildKitchenOrderWhatsAppMessage(
  order: Order,
  shift: Pick<Shift, 'name'>,
  options: KitchenMessageOptions = {}
): string {
  const lines = order.items.map((item) => {
    const parts = [`${item.qty}x ${item.name}`];
    if (item.egg) parts.push('dengan telur');
    if (item.temp) parts.push(item.temp.toLowerCase());
    parts.push(formatRupiah(item.unit * item.qty));
    let line = parts.join(' — ');
    if (item.note) line += `\n   Catatan item: ${item.note}`;
    return line;
  });

  const adminBase = (options.adminUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
  const out = [
    ...(options.resend ? ['[KIRIM ULANG — order yang sama, bukan pesanan baru]'] : []),
    'PESANAN ONLINE — WARMINDO PUTRA VANGKALAN',
    `No. order: ${order.number}`,
    `Pembayaran: ${order.payment === 'PAID' ? 'LUNAS' : order.payment}`,
    `Pelanggan: ${order.name}`,
    `WA pelanggan: ${order.phone}`,
    `Ambil: ${formatLongDateWIB(order.pickup)}, ${formatTimeWIB(order.pickup)} WIB (${
      order.mode === 'asap' ? 'secepatnya' : 'terjadwal'
    })`,
    '',
    ...lines,
    `Catatan order: ${order.note || '-'}`,
    `Total dibayar: ${formatRupiah(order.total)}`,
    '',
    ...(order.needsTimeConfirmation
      ? ['PERHATIAN: pembayaran masuk terlambat, waktu ambil mungkin tidak terkejar. Hubungi pelanggan untuk konfirmasi.', '']
      : []),
    `Halo ${shift.name}, siapkan mendekati waktu ambil.`,
    'Hubungi pelanggan secara manual ketika siap.',
    ...(adminBase ? [`Detail admin: ${adminBase}/admin/antrean`] : []),
  ];
  return out.join('\n');
}
