import { NextResponse, connection } from 'next/server';
import { isAdminRequest } from '@/server/auth';
import { getDb } from '@/server/db';
import { readGalleryFile } from '@/server/gallery/storage';
import { HttpError, handle } from '@/server/http';
import { getGalleryPhoto } from '@/server/repos/gallery';

/** Berkas foto. Publik hanya untuk foto yang disetujui; foto yang menunggu hanya untuk admin. */
export const GET = handle(async (request: Request, ctx: RouteContext<'/api/gallery/[id]/image'>) => {
  await connection();
  const { id } = await ctx.params;
  if (!/^gal_[0-9a-f-]{36}$/.test(id)) throw new HttpError(404, 'Foto tidak ditemukan.');
  const photo = await getGalleryPhoto(getDb(), id);
  const visible = photo && (photo.status === 'APPROVED' || isAdminRequest(request));
  if (!photo || !visible) throw new HttpError(404, 'Foto tidak ditemukan.');

  const size = new URL(request.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'full';
  const file = await readGalleryFile(id, size);
  if (!file) throw new HttpError(404, 'Berkas foto tidak ditemukan.');
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(file.length),
      'X-Content-Type-Options': 'nosniff',
      // Foto publik boleh di-cache singkat (bisa disembunyikan admin sewaktu-waktu).
      'Cache-Control': photo.status === 'APPROVED' ? 'public, max-age=300' : 'private, no-store',
    },
  });
});
