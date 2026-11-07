import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { notifyKitchen } from '@/server/orders/notify';
import { getOrderById } from '@/server/repos/orders';

export const POST = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/retry-wa'>) => {
    requireAdmin(request);
    const { id } = await ctx.params;
    const db = getDb();
    const order = await getOrderById(db, id);
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.payment !== 'PAID') {
      throw new HttpError(409, 'Notifikasi hanya dikirim untuk pesanan lunas.');
    }
    const updated = await notifyKitchen(db, id);
    return json({ success: updated?.notification === 'SENT', order: updated });
  }
);
