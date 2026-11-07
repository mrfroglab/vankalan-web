/**
 * Titik masuk notifikasi dapur: buat tugas antrean untuk order lunas lalu coba kirim segera.
 * Logika antrean, retry, dan pemeriksaan UNKNOWN ada di ../wa/queue.ts.
 */

import type { Db } from '../db';
import type { Order } from '@/types';
import { getOrderById } from '../repos/orders';
import { enqueueNewOrder, kickWorker } from '../wa/queue';

export async function notifyKitchen(db: Db, orderId: string): Promise<Order | null> {
  await enqueueNewOrder(db, orderId);
  await kickWorker(db);
  return getOrderById(db, orderId);
}
