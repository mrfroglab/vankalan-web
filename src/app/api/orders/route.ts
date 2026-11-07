import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { createOrder, listOrders } from '@/server/repos/orders';
import { createOrderSchema } from '@/server/validation/schemas';
import type { CreateOrderResult } from '@/types';

export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  return json(await listOrders(getDb()));
});

// Publik: pelanggan membuat order. Harga/estimasi dihitung ulang di server.
export const POST = handle(async (request: Request) => {
  const payload = await parseBody(request, createOrderSchema);
  const order = await createOrder(getDb(), payload);
  // snapToken diisi saat integrasi Midtrans server (langkah pembayaran).
  const result: CreateOrderResult = { order };
  return json(result, 201);
});
