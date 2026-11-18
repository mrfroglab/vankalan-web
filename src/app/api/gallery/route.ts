import { connection } from 'next/server';
import { getDb } from '@/server/db';
import { CAPTION_MAX, NAME_MAX, submitGalleryPhoto } from '@/server/gallery/service';
import { MAX_UPLOAD_BYTES } from '@/server/gallery/image';
import { HttpError, handle, json } from '@/server/http';
import { clientIp } from '@/server/rateLimit';
import { getGallerySettings, listGalleryPhotos, toPublicPhoto } from '@/server/repos/gallery';

/** Galeri publik: hanya foto yang sudah disetujui. ?before=<createdAt>_<id> untuk halaman berikutnya. */
export const GET = handle(async (request: Request) => {
  await connection();
  const url = new URL(request.url);
  const before = url.searchParams.get('before')?.match(/^(\d+)_(gal_[0-9a-f-]{36})$/);
  const db = getDb();
  const [photos, settings] = await Promise.all([
    listGalleryPhotos(db, 'APPROVED', {
      limit: 24,
      before: before ? { createdAt: Number(before[1]), id: before[2] } : undefined,
    }),
    getGallerySettings(db),
  ]);
  const last = photos.at(-1);
  return json({
    photos: photos.map(toPublicPhoto),
    nextCursor: photos.length === 24 && last ? `${last.createdAt}_${last.id}` : null,
    submissionsOpen: settings.enabled,
    limits: { nameMax: NAME_MAX, captionMax: CAPTION_MAX, maxBytes: MAX_UPLOAD_BYTES },
  });
});

/** Kirim foto (multipart/form-data: photo, name, caption, consent, website[honeypot]). */
export const POST = handle(async (request: Request) => {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError(413, 'Ukuran foto maksimal 10 MB.');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'Data kiriman tidak valid.');
  }
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : '';
  };
  if (str('consent') !== 'true') {
    throw new HttpError(400, 'Centang persetujuan bahwa foto boleh ditampilkan di galeri.');
  }
  const photo = form.get('photo');
  if (!(photo instanceof File)) throw new HttpError(400, 'Foto belum dipilih.');
  if (photo.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'Ukuran foto maksimal 10 MB.');

  // Honeypot: kolom tersembunyi yang hanya diisi bot. Pura-pura berhasil agar bot tidak belajar.
  if (str('website')) return json({ status: 'PENDING' }, 201);

  const saved = await submitGalleryPhoto(getDb(), {
    name: str('name'),
    caption: str('caption'),
    file: Buffer.from(await photo.arrayBuffer()),
    ip: clientIp(request),
  });
  return json({ status: saved.status }, 201);
});
