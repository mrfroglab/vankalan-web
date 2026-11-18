import { connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { handle, json } from '@/server/http';
import { galleryCounts, listGalleryPhotos } from '@/server/repos/gallery';

/**
 * Daftar untuk moderasi: ?status=PENDING|APPROVED (default PENDING), 100 terbaru.
 * ?only=counts hanya mengembalikan jumlah (dipakai lencana sidebar admin).
 */
export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  const params = new URL(request.url).searchParams;
  const db = getDb();
  if (params.get('only') === 'counts') return json({ counts: await galleryCounts(db) });
  const status = params.get('status') === 'APPROVED' ? 'APPROVED' : 'PENDING';
  const [photos, counts] = await Promise.all([listGalleryPhotos(db, status, { limit: 100 }), galleryCounts(db)]);
  return json({ photos, counts });
});
