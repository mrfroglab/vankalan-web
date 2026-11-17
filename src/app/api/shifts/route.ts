import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json, parseBody } from '@/server/http';
import { listShifts, replaceShifts } from '@/server/repos/settings';
import { putShiftsSchema } from '@/server/validation/schemas';

// Berisi nomor HP penjaga, jadi keduanya khusus admin.
export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  return json(await listShifts(getDb()));
});

export const PUT = handle(async (request: Request) => {
  requireAdmin(request);
  const { shifts } = await parseBody(request, putShiftsSchema);
  return json(await replaceShifts(getDb(), shifts));
});
