import { connection } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/server/auth';
import { HttpError, handle, json, parseBody } from '@/server/http';
import { controlSession, getSessionState, getWahaConfig } from '@/server/wa/waha';

const bodySchema = z.object({ action: z.enum(['start', 'restart', 'logout']) });

/** Start / restart / logout sesi WhatsApp di WAHA dari dashboard. Khusus admin. */
export const POST = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  const cfg = getWahaConfig();
  if (!cfg) throw new HttpError(503, 'WAHA belum dikonfigurasi.');
  const { action } = await parseBody(request, bodySchema);
  try {
    await controlSession(cfg, action);
  } catch (err) {
    throw new HttpError(502, (err as Error).message || 'WAHA tidak dapat dihubungi.');
  }
  return json({ configured: true, session: cfg.session, ...(await getSessionState(cfg)) });
});
