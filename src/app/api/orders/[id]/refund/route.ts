import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { recordRefund } from '@/server/repos/orders';
import { refundSchema } from '@/server/validation/schemas';

export const POST = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/refund'>) => {
    requireAdmin(request);
    const { id } = await ctx.params;
    const refund = await parseBody(request, refundSchema);
    return json(await recordRefund(getDb(), id, refund));
  }
);
