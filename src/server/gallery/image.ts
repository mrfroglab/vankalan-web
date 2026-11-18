/**
 * Pemrosesan foto galeri dengan sharp.
 *
 * Setiap unggahan di-decode lalu di-encode ulang ke WebP, sehingga:
 * - hanya gambar sungguhan yang lolos (berkas lain/rusak gagal di-decode),
 * - metadata (EXIF, termasuk lokasi GPS dari HP) dibuang; sharp tidak menyalin metadata
 *   kecuali diminta,
 * - orientasi diterapkan dulu (rotate()) supaya foto HP tidak miring setelah EXIF dibuang,
 * - ukuran dibatasi: versi penuh maks 1600 px, thumbnail maks 480 px (sisi terpanjang).
 */

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from '../http';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_SIDE = 200;
const MAX_INPUT_PIXELS = 50_000_000;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  contentHash: string;
}

export async function processGalleryImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new HttpError(400, 'Foto belum dipilih.');
  if (input.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'Ukuran foto maksimal 10 MB.');

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new HttpError(400, 'Berkas bukan foto yang valid. Gunakan JPG, PNG, atau WebP.');
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new HttpError(400, 'Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.');
  }
  if ((meta.pages ?? 1) > 1) throw new HttpError(400, 'Foto bergerak/animasi tidak didukung.');

  try {
    const base = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    const { data: full, info } = await base()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (Math.min(info.width, info.height) < MIN_SIDE) {
      throw new HttpError(400, `Foto terlalu kecil (minimal ${MIN_SIDE} px).`);
    }
    const thumb = await base()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    return {
      full,
      thumb,
      width: info.width,
      height: info.height,
      contentHash: createHash('sha256').update(full).digest('hex'),
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, 'Foto gagal diproses. Coba foto lain.');
  }
}
