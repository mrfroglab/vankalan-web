/**
 * Pengiriman notifikasi WhatsApp ke penjaga sif (STOPGAP).
 * Mengirim sekali secara inline lewat WAHA. Antrean dengan retry yang bertahan
 * setelah restart (PRD 14.3) adalah pekerjaan langkah berikutnya.
 */

import type { Db } from '../db';
import type { Order } from '@/types';
import { buildKitchenOrderWhatsAppMessage, sendWhatsAppMessage } from '@/lib/waha';
import { getOrderById, setNotification } from '../repos/orders';
import { getSettings, listShifts } from '../repos/settings';

export async function notifyKitchen(db: Db, orderId: string): Promise<Order | null> {
  const order = await getOrderById(db, orderId);
  if (!order) return null;

  const [settings, shifts] = await Promise.all([getSettings(db), listShifts(db)]);
  // Retry selalu memakai penjaga yang aktif sekarang (serah terima sif).
  const shift =
    shifts.find((s) => s.id === settings.recipientShiftId) ??
    shifts.find((s) => s.id === order.recipientShiftId);

  if (!shift || !settings.waConnected) {
    return setNotification(db, orderId, 'FAILED', shift?.id);
  }

  const ok = await sendWhatsAppMessage({
    toPhone: shift.phone,
    body: buildKitchenOrderWhatsAppMessage(order, shift),
  });
  return setNotification(db, orderId, ok ? 'SENT' : 'FAILED', shift.id);
}
