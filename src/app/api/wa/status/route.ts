import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { handle, json } from '@/server/http';
import { getSessionState, getWahaConfig } from '@/server/wa/waha';

/** Kondisi sesi WhatsApp di WAHA (FR-36): apakah perlu scan QR ulang. Khusus admin. */
export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  const cfg = getWahaConfig();
  if (!cfg) return json({ configured: false });
  return json({ configured: true, session: cfg.session, ...(await getSessionState(cfg)) });
});
