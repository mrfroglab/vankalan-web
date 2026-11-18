import { z } from 'zod';
import { requireAdmin } from '@/server/auth';
import { getDb } from '@/server/db';
import { CAPTION_MAX, deleteGalleryPhoto } from '@/server/gallery/service';
import { HttpError, handle, json, parseBody } from '@/server/http';
import { approveGalleryPhoto, unpublishGalleryPhoto } from '@/server/repos/gallery';

const patchSchema = z.discriminatedUnion('action', [
  // Admin boleh merapikan caption saat menyetujui (tanpa filter: admin yang bertanggung jawab).
  z.object({ action: z.literal('approve'), caption: z.string().max(CAPTION_MAX).optional() }),
  z.object({ action: z.literal('unpublish') }),
]);

export const PATCH = handle(async (request: Request, ctx: RouteContext<'/api/gallery/[id]'>) => {
  requireAdmin(request);
  const { id } = await ctx.params;
  const body = await parseBody(request, patchSchema);
  const db = getDb();
  const photo =
    body.action === 'approve'
      ? await approveGalleryPhoto(db, id, body.caption?.trim())
      : await unpublishGalleryPhoto(db, id);
  if (!photo) throw new HttpError(404, 'Foto tidak ditemukan.');
  return json(photo);
});

/** Tolak / hapus permanen (baris + berkas). */
export const DELETE = handle(async (request: Request, ctx: RouteContext<'/api/gallery/[id]'>) => {
  requireAdmin(request);
  const { id } = await ctx.params;
  if (!(await deleteGalleryPhoto(getDb(), id))) throw new HttpError(404, 'Foto tidak ditemukan.');
  return json({ ok: true });
});
