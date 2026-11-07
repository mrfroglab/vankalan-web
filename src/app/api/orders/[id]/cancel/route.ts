import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { cancelOrder } from '@/server/repos/orders';
import { cancelSchema } from '@/server/validation/schemas';

export const POST = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/cancel'>) => {
    requireAdmin(request);
    const { id } = await ctx.params;
    const { reason } = await parseBody(request, cancelSchema);
    return json(await cancelOrder(getDb(), id, reason));
  }
);
