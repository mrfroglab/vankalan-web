import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { listCategories, replaceCategories } from '@/server/repos/settings';
import { putCategoriesSchema } from '@/server/validation/schemas';

export const GET = handle(async () => {
  await connection();
  return json(await listCategories(getDb()));
});

export const PUT = handle(async (request: Request) => {
  requireAdmin(request);
  const { categories } = await parseBody(request, putCategoriesSchema);
  return json(await replaceCategories(getDb(), categories));
});
