import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { getMidtransConfig } from '@/server/payments/midtrans';
import { reconcilePending } from '@/server/payments/service';

/** Rekonsiliasi massal pembayaran PENDING (webhook terlambat/hilang). Khusus admin. */
export const POST = handle(async (request: Request) => {
  requireAdmin(request);
  const cfg = getMidtransConfig();
  if (!cfg) throw new HttpError(503, 'Pembayaran online belum dikonfigurasi.');
  return json(await reconcilePending(getDb(), cfg));
});
