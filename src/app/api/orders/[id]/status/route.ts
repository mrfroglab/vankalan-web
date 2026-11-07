import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { updateFulfillment } from '@/server/repos/orders';
import { statusSchema } from '@/server/validation/schemas';

export const PATCH = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/status'>) => {
    requireAdmin(request);
    const { id } = await ctx.params;
    const { fulfillment } = await parseBody(request, statusSchema);
    return json(await updateFulfillment(getDb(), id, fulfillment));
  }
);
