/**
 * Alur kiriman galeri: batas frekuensi -> validasi teks -> proses foto -> simpan -> catat.
 *
 * Aturan moderasi:
 * - Filter otomatis (filter.ts) menolak kata kasar, judi online, tautan, nomor HP, dan email.
 * - Mode default: semua foto menunggu persetujuan admin (PENDING).
 * - Mode setujui otomatis: foto langsung tampil, KECUALI ada tanda (duplikat / pengirim
 *   yang sama sudah mengirim banyak hari ini); itu tetap menunggu admin.
 */

import { createHash, randomUUID } from 'node:crypto';
import type { GalleryPhoto } from '@/types';
import type { Db } from '../db';
import { HttpError } from '../http';
import {
  countPending,
  countRecentBySubmitter,
  deleteGalleryPhotoRow,
  getGallerySettings,
  hasDuplicate,
  insertGalleryPhoto,
} from '../repos/gallery';
import { checkGalleryText } from './filter';
import { processGalleryImage } from './image';
import { deleteGalleryFiles, saveGalleryFiles } from './storage';

export const NAME_MAX = 40;
export const CAPTION_MAX = 200;
const MAX_PENDING = 300;
const HOUR = 60 * 60 * 1000;
const PER_IP_PER_HOUR = 5;
const GLOBAL_PER_HOUR = 60;
const FLAG_SAME_SUBMITTER_PER_DAY = 3;

// Batas frekuensi in-memory (satu container), dua lapis seperti rateLimit.ts.
const hits = new Map<string, number[]>();
function allow(key: string, max: number, now: number): boolean {
  const list = (hits.get(key) ?? []).filter((t) => t > now - HOUR);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}
/** Untuk test. */
export function resetGalleryRateLimit(): void {
  hits.clear();
}

export function submitterHashFor(ip: string): string {
  return createHash('sha256')
    .update(`${ip}|${process.env.SESSION_SECRET ?? ''}`)
    .digest('hex')
    .slice(0, 32);
}

export interface GallerySubmission {
  name: string;
  caption: string;
  file: Buffer;
  ip: string;
  now?: number;
}

export async function submitGalleryPhoto(db: Db, input: GallerySubmission): Promise<GalleryPhoto> {
  const now = input.now ?? Date.now();
  const settings = await getGallerySettings(db);
  if (!settings.enabled) throw new HttpError(403, 'Pengiriman foto sedang ditutup oleh warung.');

  const name = input.name.trim().replace(/\s+/g, ' ');
  const caption = input.caption.trim().replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  if (name.length > NAME_MAX) throw new HttpError(400, `Nama maksimal ${NAME_MAX} karakter.`);
  if (caption.length > CAPTION_MAX) throw new HttpError(400, `Caption maksimal ${CAPTION_MAX} karakter.`);

  const text = checkGalleryText(name, caption, settings.blockedWords);
  if (!text.ok) throw new HttpError(400, text.reason ?? 'Nama atau caption tidak diizinkan.');

  if (!allow(`ip:${input.ip}`, PER_IP_PER_HOUR, now) || !allow('global', GLOBAL_PER_HOUR, now)) {
    throw new HttpError(429, 'Terlalu banyak kiriman. Coba lagi nanti.');
  }
  if ((await countPending(db)) >= MAX_PENDING) {
    throw new HttpError(503, 'Antrean foto sedang penuh. Coba lagi besok.');
  }

  const img = await processGalleryImage(input.file);
  const submitterHash = submitterHashFor(input.ip);
  const flags: string[] = [];
  if (await hasDuplicate(db, img.contentHash)) flags.push('Foto yang sama pernah dikirim');
  if ((await countRecentBySubmitter(db, submitterHash, now - 24 * HOUR)) >= FLAG_SAME_SUBMITTER_PER_DAY) {
    flags.push('Pengirim yang sama sudah mengirim banyak foto hari ini');
  }

  const id = `gal_${randomUUID()}`;
  await saveGalleryFiles(id, img.full, img.thumb);
  try {
    return await insertGalleryPhoto(db, {
      id,
      status: settings.autoApprove && flags.length === 0 ? 'APPROVED' : 'PENDING',
      name,
      caption,
      width: img.width,
      height: img.height,
      bytes: img.full.length + img.thumb.length,
      contentHash: img.contentHash,
      flags,
      submitterHash,
      now,
    });
  } catch (err) {
    await deleteGalleryFiles(id);
    throw err;
  }
}

/** Tolak/hapus: baris dan berkas dihapus permanen. */
export async function deleteGalleryPhoto(db: Db, id: string): Promise<boolean> {
  const removed = await deleteGalleryPhotoRow(db, id);
  if (removed) await deleteGalleryFiles(id);
  return removed;
}
