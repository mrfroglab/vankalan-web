import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { getMidtransConfig } from '@/server/payments/midtrans';
import { startPayment } from '@/server/payments/service';
import { createOrder, getOrderById, listOrders } from '@/server/repos/orders';
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
  const db = getDb();
  const order = await createOrder(db, payload);

  // Order PENDING sudah tercatat sebelum pembayaran dimulai (PRD 14.2).
  // Tanpa MIDTRANS_SERVER_KEY (dev) tidak ada snapToken -> frontend memakai simulasi.
  const cfg = getMidtransConfig();
  if (!cfg) {
    const result: CreateOrderResult = { order };
    return json(result, 201);
  }

  const start = await startPayment(db, cfg, order, { appUrl: process.env.NEXT_PUBLIC_APP_URL });
  const result: CreateOrderResult = {
    order: (await getOrderById(db, order.id)) ?? order,
    snapToken: start.snapToken,
    redirectUrl: start.redirectUrl,
  };
  return json(result, 201);
});
