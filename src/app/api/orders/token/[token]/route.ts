import { connection } from 'next/server';
import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { getMidtransConfig } from '@/server/payments/midtrans';
import { reconcileOrder } from '@/server/payments/service';
import { getOrderByToken } from '@/server/repos/orders';
import { isOrderLinkExpired } from '@/server/retention';

// Publik: tautan privat pelanggan. Token tak-tertebak; token salah = 404.
export const GET = handle(async (_req: Request, ctx: RouteContext<'/api/orders/token/[token]'>) => {
  await connection();
  const { token } = await ctx.params;
  const db = getDb();
  let order = await getOrderByToken(db, token);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  if (isOrderLinkExpired(order)) {
    throw new HttpError(410, 'Tautan pesanan sudah kedaluwarsa. Hubungi warung bila perlu bantuan.');
  }

  // Jaring pengaman webhook terlambat: cek status resmi (dibatasi 1x/30 detik per transaksi).
  const cfg = getMidtransConfig();
  if (cfg && order.payment === 'PENDING') {
    const applied = await reconcileOrder(db, cfg, order.id, { minIntervalMs: 30_000 });
    if (applied.length > 0) order = (await getOrderByToken(db, token)) ?? order;
  }
  return json(order);
});
