import { Order, Shift } from '@/types';
import { formatTimeWIB, formatRupiah } from '@/lib/constants';

interface SendWhatsAppMessageParams {
  toPhone: string;
  body: string;
}

export async function sendWhatsAppMessage({ toPhone, body }: SendWhatsAppMessageParams): Promise<boolean> {
  const baseUrl = process.env.WAHA_BASE_URL;
  const session = process.env.WAHA_SESSION || 'default';
  const apiKey = process.env.WAHA_API_KEY;

  if (!baseUrl) {
    console.warn('[WAHA] Base URL belum dikonfigurasi, pesan batal dikirim.');
    return false;
  }

  const chatId = toPhone.includes('@c.us') ? toPhone : `${toPhone}@c.us`;

  try {
    const response = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
      body: JSON.stringify({
        session,
        chatId,
        text: body,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[WAHA] Gagal mengirim pesan WhatsApp:', error);
    return false;
  }
}

export function buildKitchenOrderWhatsAppMessage(order: Order, shift: Shift): string {
  const itemList = order.items
    .map((item) => {
      const parts = [`- ${item.qty}x ${item.name}`];
      if (item.egg) parts.push('(Pakai Telur)');
      if (item.temp) parts.push(`(${item.temp})`);
      if (item.note) parts.push(`[Catatan: ${item.note}]`);
      return parts.join(' ');
    })
    .join('\n');

  return `🔔 *PESANAN BARU MASUK (${order.number})*

Halo ${shift.name}, ada pesanan baru sudah lunas:
Pemesan: *${order.name}* (${order.phone})
Waktu Ambil: *${formatTimeWIB(order.pickup)}* (${order.mode === 'asap' ? 'Secepatnya' : 'Jadwal'})

*Rincian Menu:*
${itemList}

Total: *${formatRupiah(order.total)}*
Catatan Umum: ${order.note || '-'}

Silakan siapkan sebelum waktu pengambilan.`;
}
