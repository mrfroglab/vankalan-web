import { connection } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { normalizeBlockedList } from '@/server/gallery/filter';
import { handle, json, parseBody } from '@/server/http';
import { getGallerySettings, saveGallerySettings } from '@/server/repos/gallery';

const settingsSchema = z.object({
  enabled: z.boolean(),
  autoApprove: z.boolean(),
  blockedWords: z.array(z.string().max(40)).max(200),
});

export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  return json(await getGallerySettings(getDb()));
});

export const PUT = handle(async (request: Request) => {
  requireAdmin(request);
  const body = await parseBody(request, settingsSchema);
  return json(
    await saveGallerySettings(getDb(), { ...body, blockedWords: normalizeBlockedList(body.blockedWords) })
  );
});
