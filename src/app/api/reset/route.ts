import { assertDevOnly, requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { replaceOrdersWithSeed } from '@/server/repos/orders';
import { seedDefaults } from '@/server/repos/defaults';
import { createSeedOrders } from '@/lib/store';

export const POST = handle(async (request: Request) => {
  requireAdmin(request);
  assertDevOnly();
  const db = getDb();
  await seedDefaults(db);
  await replaceOrdersWithSeed(db, createSeedOrders());
  return json({ success: true });
});
