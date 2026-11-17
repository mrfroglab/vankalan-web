import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { resendNotification } from '@/server/wa/queue';

/** Kirim ulang manual ke sif aktif sekarang (eksplisit; memeriksa riwayat WA bila sebelumnya UNKNOWN). */
export const POST = handle(
  async (request: Request, ctx: RouteContext<'/api/orders/[id]/retry-wa'>) => {
    requireAdmin(request);
    const { id } = await ctx.params;
    const { order, alreadySent } = await resendNotification(getDb(), id);
    return json({
      success: order.notification === 'SENT',
      alreadySent,
      order,
    });
  }
);
