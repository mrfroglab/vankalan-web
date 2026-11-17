import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { getRetentionConfig, purgeExpiredData } from '@/server/retention';

/** Jalankan kebijakan retensi sekarang (juga berjalan otomatis berkala di pekerja). Khusus admin. */
export const POST = handle(async (request: Request) => {
  requireAdmin(request);
  const config = getRetentionConfig();
  return json({ config, ...(await purgeExpiredData(getDb(), Date.now(), config)) });
});
