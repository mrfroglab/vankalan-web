/**
 * Penyimpanan berkas galeri di disk. Lokasi: GALLERY_DIR, default <cwd>/data/gallery
 * (di container: /app/data/gallery, wajib di-mount sebagai volume agar tidak hilang saat deploy).
 * Nama berkas berasal dari id yang dibuat server (gal_<uuid>), bukan dari input pengguna.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type GallerySize = 'full' | 'thumb';

export function galleryDir(): string {
  return process.env.GALLERY_DIR?.trim() || path.join(process.cwd(), 'data', 'gallery');
}

const ID_RE = /^gal_[0-9a-f-]{36}$/;

function fileFor(id: string, size: GallerySize): string {
  if (!ID_RE.test(id)) throw new Error('id galeri tidak valid');
  return path.join(galleryDir(), `${id}${size === 'thumb' ? '.thumb' : ''}.webp`);
}

export async function saveGalleryFiles(id: string, full: Buffer, thumb: Buffer): Promise<void> {
  await mkdir(galleryDir(), { recursive: true });
  await writeFile(fileFor(id, 'full'), full);
  await writeFile(fileFor(id, 'thumb'), thumb);
}

export async function readGalleryFile(id: string, size: GallerySize): Promise<Buffer | null> {
  try {
    return await readFile(fileFor(id, size));
  } catch {
    return null;
  }
}

export async function deleteGalleryFiles(id: string): Promise<void> {
  await Promise.all([rm(fileFor(id, 'full'), { force: true }), rm(fileFor(id, 'thumb'), { force: true })]);
}
