import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { getOrderById } from '@/server/repos/orders';

export const GET = handle(async (request: Request, ctx: RouteContext<'/api/orders/[id]'>) => {
  requireAdmin(request);
  await connection();
  const { id } = await ctx.params;
  const order = await getOrderById(getDb(), id);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  return json(order);
});
