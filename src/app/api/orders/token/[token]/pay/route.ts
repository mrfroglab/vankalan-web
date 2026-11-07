import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { getMidtransConfig } from '@/server/payments/midtrans';
import { resumePayment } from '@/server/payments/service';
import { getOrderByToken } from '@/server/repos/orders';

/**
 * Mulai/lanjutkan pembayaran order milik pelanggan (kredensial = token privat).
 * Memakai ulang token Snap yang masih berlaku; percobaan baru hanya bila yang lama
 * kedaluwarsa/gagal, dan didahului pengecekan status agar order lunas tidak ditagih lagi.
 */
export const POST = handle(async (_req: Request, ctx: RouteContext<'/api/orders/token/[token]/pay'>) => {
  const cfg = getMidtransConfig();
  if (!cfg) throw new HttpError(503, 'Pembayaran online belum dikonfigurasi.');
  const { token } = await ctx.params;
  const db = getDb();
  const order = await getOrderByToken(db, token);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  const start = await resumePayment(db, cfg, order.id, { appUrl: process.env.NEXT_PUBLIC_APP_URL });
  return json(start);
});
