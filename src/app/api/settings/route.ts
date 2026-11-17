import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { getSettings, patchSettings } from '@/server/repos/settings';
import { patchSettingsSchema } from '@/server/validation/schemas';

export const GET = handle(async () => {
  await connection();
  return json(await getSettings(getDb()));
});

export const PATCH = handle(async (request: Request) => {
  requireAdmin(request);
  const patch = await parseBody(request, patchSettingsSchema);
  return json(await patchSettings(getDb(), patch));
});
