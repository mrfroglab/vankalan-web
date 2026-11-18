/** Akses data galeri (foto + pengaturan). */

import { and, count, desc, eq, gte, lt, ne, or, sql } from 'drizzle-orm';
import type { GalleryPhoto, GallerySettings, GalleryStatus } from '@/types';
import type { Db } from '../db';
import { galleryPhotos, gallerySettings, type DbGalleryPhoto } from '../db/schema';

export function toGalleryPhoto(row: DbGalleryPhoto): GalleryPhoto {
  return {
    id: row.id,
    status: row.status as GalleryStatus,
    name: row.name,
    caption: row.caption,
    width: row.width,
    height: row.height,
    flags: row.flags ?? [],
    createdAt: row.createdAt.getTime(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.getTime() : null,
  };
}

/** Versi publik: tanpa flag moderasi. */
export function toPublicPhoto(p: GalleryPhoto) {
  return { id: p.id, name: p.name, caption: p.caption, width: p.width, height: p.height, createdAt: p.createdAt };
}

const DEFAULT_SETTINGS: GallerySettings = { enabled: true, autoApprove: false, blockedWords: [] };

export async function getGallerySettings(db: Db): Promise<GallerySettings> {
  const [row] = await db.select().from(gallerySettings).where(eq(gallerySettings.id, 1));
  if (!row) return { ...DEFAULT_SETTINGS };
  return { enabled: row.enabled, autoApprove: row.autoApprove, blockedWords: row.blockedWords ?? [] };
}

export async function saveGallerySettings(db: Db, s: GallerySettings): Promise<GallerySettings> {
  await db
    .insert(gallerySettings)
    .values({ id: 1, ...s, updatedAt: new Date() })
    .onConflictDoUpdate({ target: gallerySettings.id, set: { ...s, updatedAt: new Date() } });
  return getGallerySettings(db);
}

export interface NewGalleryPhoto {
  id: string;
  status: GalleryStatus;
  name: string;
  caption: string;
  width: number;
  height: number;
  bytes: number;
  contentHash: string;
  flags: string[];
  submitterHash: string;
  now: number;
}

export async function insertGalleryPhoto(db: Db, p: NewGalleryPhoto): Promise<GalleryPhoto> {
  const [row] = await db
    .insert(galleryPhotos)
    .values({
      id: p.id,
      status: p.status,
      name: p.name,
      caption: p.caption,
      width: p.width,
      height: p.height,
      bytes: p.bytes,
      contentHash: p.contentHash,
      flags: p.flags,
      submitterHash: p.submitterHash,
      createdAt: new Date(p.now),
      reviewedAt: p.status === 'APPROVED' ? new Date(p.now) : null,
    })
    .returning();
  return toGalleryPhoto(row);
}

export async function countPending(db: Db): Promise<number> {
  const [r] = await db.select({ n: count() }).from(galleryPhotos).where(eq(galleryPhotos.status, 'PENDING'));
  return Number(r.n);
}

export async function countRecentBySubmitter(db: Db, submitterHash: string, sinceMs: number): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(galleryPhotos)
    .where(and(eq(galleryPhotos.submitterHash, submitterHash), gte(galleryPhotos.createdAt, new Date(sinceMs))));
  return Number(r.n);
}

export async function hasDuplicate(db: Db, contentHash: string): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.contentHash, contentHash));
  return Number(r.n) > 0;
}

export async function getGalleryPhoto(db: Db, id: string): Promise<GalleryPhoto | null> {
  const [row] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id));
  return row ? toGalleryPhoto(row) : null;
}

/** Daftar per status, terbaru dulu, dengan kursor createdAt (epoch ms) + id. */
export async function listGalleryPhotos(
  db: Db,
  status: GalleryStatus,
  opts: { limit?: number; before?: { createdAt: number; id: string } } = {}
): Promise<GalleryPhoto[]> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  const b = opts.before;
  const rows = await db
    .select()
    .from(galleryPhotos)
    .where(
      and(
        eq(galleryPhotos.status, status),
        b
          ? or(
              lt(galleryPhotos.createdAt, new Date(b.createdAt)),
              and(eq(galleryPhotos.createdAt, new Date(b.createdAt)), lt(galleryPhotos.id, b.id))
            )
          : undefined
      )
    )
    .orderBy(desc(galleryPhotos.createdAt), desc(galleryPhotos.id))
    .limit(limit);
  return rows.map(toGalleryPhoto);
}

export async function approveGalleryPhoto(db: Db, id: string, caption?: string): Promise<GalleryPhoto | null> {
  const [row] = await db
    .update(galleryPhotos)
    .set({ status: 'APPROVED', reviewedAt: new Date(), ...(caption !== undefined ? { caption } : {}) })
    .where(eq(galleryPhotos.id, id))
    .returning();
  return row ? toGalleryPhoto(row) : null;
}

/** Kembalikan foto yang sudah tampil ke antrean (disembunyikan dari publik). */
export async function unpublishGalleryPhoto(db: Db, id: string): Promise<GalleryPhoto | null> {
  const [row] = await db
    .update(galleryPhotos)
    .set({ status: 'PENDING', reviewedAt: new Date() })
    .where(and(eq(galleryPhotos.id, id), ne(galleryPhotos.status, 'PENDING')))
    .returning();
  return row ? toGalleryPhoto(row) : null;
}

export async function deleteGalleryPhotoRow(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id)).returning({ id: galleryPhotos.id });
  return rows.length > 0;
}

export async function galleryCounts(db: Db): Promise<Record<GalleryStatus, number>> {
  const rows = await db
    .select({ status: galleryPhotos.status, n: sql<number>`count(*)` })
    .from(galleryPhotos)
    .groupBy(galleryPhotos.status);
  const out: Record<GalleryStatus, number> = { PENDING: 0, APPROVED: 0 };
  for (const r of rows) if (r.status === 'PENDING' || r.status === 'APPROVED') out[r.status] = Number(r.n);
  return out;
}
