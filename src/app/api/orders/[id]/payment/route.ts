import { assertPaymentSimulationAllowed, requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { notifyKitchen } from '@/server/orders/notify';
import { setPayment } from '@/server/repos/orders';
import { paymentSchema } from '@/server/validation/schemas';

/**
 * Simulasi pembayaran untuk dev/sandbox saja (opt-in ALLOW_PAYMENT_SIMULATION=true).
 * Di production status PAID hanya boleh datang dari webhook Midtrans terverifikasi.
 */
export const PATCH = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/payment'>) => {
    requireAdmin(request);
    assertPaymentSimulationAllowed();
    const { id } = await ctx.params;
    const { payment } = await parseBody(request, paymentSchema);
    const db = getDb();
    const before = await setPayment(db, id, payment);
    if (payment === 'PAID' && before.notification === 'QUEUED') {
      return json((await notifyKitchen(db, id)) ?? before);
    }
    return json(before);
  }
);
