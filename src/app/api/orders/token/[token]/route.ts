import { connection } from 'next/server';
import { getDb } from '@/server/db';
import { HttpError, handle, json } from '@/server/http';
import { getOrderByToken } from '@/server/repos/orders';

// Publik: tautan privat pelanggan. Token tak-tertebak; token salah = 404.
export const GET = handle(async (_req: Request, ctx: RouteContext<'/api/orders/token/[token]'>) => {
  await connection();
  const { token } = await ctx.params;
  const order = await getOrderByToken(getDb(), token);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  return json(order);
});
