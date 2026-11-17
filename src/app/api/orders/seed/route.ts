import { assertDevOnly, requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { replaceOrdersWithSeed } from '@/server/repos/orders';
import { createSeedOrders } from '@/lib/store';

export const POST = handle(async (request: Request) => {
  requireAdmin(request);
  assertDevOnly();
  return json(await replaceOrdersWithSeed(getDb(), createSeedOrders()));
});
