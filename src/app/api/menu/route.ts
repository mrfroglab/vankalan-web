import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { listMenu, replaceMenu } from '@/server/repos/settings';
import { putMenuSchema } from '@/server/validation/schemas';

export const GET = handle(async () => {
  await connection();
  return json(await listMenu(getDb()));
});

export const PUT = handle(async (request: Request) => {
  requireAdmin(request);
  const { items } = await parseBody(request, putMenuSchema);
  return json(await replaceMenu(getDb(), items));
});
