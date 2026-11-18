import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { galleryCounts, listGalleryPhotos } from '@/server/repos/gallery';

/** Daftar untuk moderasi: ?status=PENDING|APPROVED (default PENDING), 100 terbaru. */
export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  const status = new URL(request.url).searchParams.get('status') === 'APPROVED' ? 'APPROVED' : 'PENDING';
  const db = getDb();
  const [photos, counts] = await Promise.all([listGalleryPhotos(db, status, { limit: 100 }), galleryCounts(db)]);
  return json({ photos, counts });
});
