/**
 * Antrean notifikasi WhatsApp ke penjaga (PRD 7.3, 8.3 FR-31..35, 14.3).
 *
 * Prinsip:
 * - Tugas disimpan di DB (notification_jobs) sehingga bertahan setelah restart; order & pembayaran
 *   tidak pernah bergantung pada keberhasilan WA.
 * - Kegagalan PASTI (WAHA mati/menolak) di-retry dengan jeda (default 30 dtk, 2 mnt, 5 mnt), lalu
 *   FAILED = perlu tindakan manual.
 * - Hasil TIDAK PASTI (timeout/putus saat kirim, atau proses mati di tengah kirim) menjadi UNKNOWN:
 *   tidak di-retry buta; riwayat WA diperiksa dulu untuk nomor order, baru diputuskan.
 * - Sebelum mengirim, status order dicek ulang: order selesai/dibatalkan tidak dikirimi instruksi masak.
 * - Penerima di-snapshot saat tugas dibuat; retry otomatis memakai penerima yang sama. Berpindah ke
 *   penjaga pengganti hanya lewat kirim ulang manual yang eksplisit.
 * - Tidak ada jaminan exactly-once; nomor order konsisten membantu mengenali pesan ganda.
 */

import { and, asc, desc, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';
import type { Order, Shift } from '@/types';
import { buildKitchenOrderWhatsAppMessage } from '@/lib/waha';
import { HttpError } from '../http';
import type { Db } from '../db';
import { notificationJobs, orders, type DbNotificationJob } from '../db/schema';
import { getOrderById } from '../repos/orders';
import { getSettings, listShifts } from '../repos/settings';
import { getSessionState, getWahaConfig, sendWhatsAppText, wasMessageSent, type SendResult } from './waha';

const LEASE_MS = 2 * 60 * 1000;
/** Jeda sebelum riwayat WA diperiksa untuk tugas UNKNOWN (beri waktu tersinkron). WA_VERIFY_DELAY_SECONDS. */
function verifyDelayMs(): number {
  const n = Number(process.env.WA_VERIFY_DELAY_SECONDS);
  return (Number.isFinite(n) && n >= 0 ? n : 120) * 1000;
}
export const MAX_VERIFY_ATTEMPTS = 3;
const FINAL_FULFILLMENT = ['COMPLETED', 'CANCELLED'];

/** Jeda retry dalam detik (WA_RETRY_DELAYS_SECONDS="30,120,300"); jumlah percobaan = jeda + 1. */
export function retryDelaysSeconds(): number[] {
  const raw = process.env.WA_RETRY_DELAYS_SECONDS?.trim();
  const parsed = raw
    ?.split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return parsed && parsed.length > 0 ? parsed : [30, 120, 300];
}

export type OrderNotificationStatus = Order['notification'];

/** Status tugas -> status ringkas di order (untuk dashboard). null = jangan ubah. */
export function toOrderNotification(job: Pick<DbNotificationJob, 'status' | 'attempts'>): OrderNotificationStatus | null {
  switch (job.status) {
    case 'SENT':
      return 'SENT';
    case 'UNKNOWN':
      return 'UNKNOWN';
    case 'FAILED':
      return 'FAILED';
    case 'QUEUED':
      // Sudah pernah dicoba lalu menunggu retry: tampilkan sebagai gagal agar terlihat penjaga.
      return job.attempts > 0 ? 'FAILED' : 'QUEUED';
    case 'SENDING':
      return 'QUEUED';
    default:
      return null;
  }
}

async function syncOrder(db: Db, job: DbNotificationJob): Promise<void> {
  const status = toOrderNotification(job);
  if (!status) return;
  await db
    .update(orders)
    .set({
      notificationStatus: status,
      attempts: job.attempts,
      ...(job.recipientShiftId ? { recipientShiftId: job.recipientShiftId } : {}),
    })
    .where(eq(orders.id, job.orderId));
}

async function update(
  db: Db,
  id: number,
  patch: Partial<typeof notificationJobs.$inferInsert>
): Promise<DbNotificationJob> {
  const [row] = await db
    .update(notificationJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(notificationJobs.id, id))
    .returning();
  await syncOrder(db, row);
  return row;
}

/** Penerima aktif sekarang (sif aktif di pengaturan), cadangan: sif pertama. */
export async function resolveRecipient(db: Db): Promise<Shift | null> {
  const [settings, shifts] = await Promise.all([getSettings(db), listShifts(db)]);
  return shifts.find((s) => s.id === settings.recipientShiftId) ?? shifts[0] ?? null;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

async function insertJob(
  db: Db,
  order: Order,
  kind: 'NEW_ORDER' | 'RESEND',
  recipient: Shift | null,
  now: number
): Promise<DbNotificationJob> {
  const [row] = await db
    .insert(notificationJobs)
    .values({
      orderId: order.id,
      kind,
      status: recipient ? 'QUEUED' : 'FAILED',
      recipientShiftId: recipient?.id ?? null,
      recipientName: recipient?.name ?? null,
      recipientPhone: recipient?.phone ?? null,
      maxAttempts: retryDelaysSeconds().length + 1,
      nextAttemptAt: new Date(now),
      lastError: recipient ? null : 'Tidak ada penerima aktif (belum ada penjaga terdaftar).',
    })
    .returning();
  await syncOrder(db, row);
  return row;
}

/** Buat tugas notifikasi otomatis untuk order lunas. Idempoten: maksimal satu per order. */
export async function enqueueNewOrder(
  db: Db,
  orderId: string,
  now: number = Date.now()
): Promise<DbNotificationJob | null> {
  const order = await getOrderById(db, orderId);
  if (!order || order.payment !== 'PAID') return null;

  const [existing] = await db
    .select()
    .from(notificationJobs)
    .where(and(eq(notificationJobs.orderId, orderId), eq(notificationJobs.kind, 'NEW_ORDER')));
  if (existing) return existing;

  try {
    return await insertJob(db, order, 'NEW_ORDER', await resolveRecipient(db), now);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [raced] = await db
      .select()
      .from(notificationJobs)
      .where(and(eq(notificationJobs.orderId, orderId), eq(notificationJobs.kind, 'NEW_ORDER')));
    return raced ?? null;
  }
}

interface Claimed {
  sends: DbNotificationJob[];
  verifies: DbNotificationJob[];
}

/** Ambil tugas yang jatuh tempo secara eksklusif (aman untuk beberapa pekerja). */
async function claimDue(db: Db, now: number, limit: number): Promise<Claimed> {
  const nowD = new Date(now);
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(notificationJobs)
      .where(
        or(
          and(eq(notificationJobs.status, 'QUEUED'), lte(notificationJobs.nextAttemptAt, nowD)),
          and(
            eq(notificationJobs.status, 'UNKNOWN'),
            lte(notificationJobs.nextAttemptAt, nowD),
            lt(notificationJobs.verifyAttempts, MAX_VERIFY_ATTEMPTS),
            or(sql`${notificationJobs.lockedUntil} is null`, lt(notificationJobs.lockedUntil, nowD))
          ),
          and(eq(notificationJobs.status, 'SENDING'), lt(notificationJobs.lockedUntil, nowD))
        )
      )
      .orderBy(asc(notificationJobs.id))
      .limit(limit)
      .for('update', { skipLocked: true });

    const claimed: Claimed = { sends: [], verifies: [] };
    for (const r of rows) {
      const lease = new Date(now + LEASE_MS);
      if (r.status === 'SENDING') {
        // Proses mati di tengah kirim: mungkin sudah terkirim -> jangan kirim lagi, periksa dulu.
        await tx
          .update(notificationJobs)
          .set({
            status: 'UNKNOWN',
            lockedUntil: null,
            nextAttemptAt: new Date(now),
            lastError: 'Proses berhenti saat mengirim; hasil tidak diketahui.',
            updatedAt: nowD,
          })
          .where(eq(notificationJobs.id, r.id));
      } else if (r.status === 'QUEUED') {
        const [u] = await tx
          .update(notificationJobs)
          .set({ status: 'SENDING', attempts: r.attempts + 1, lockedUntil: lease, updatedAt: nowD })
          .where(eq(notificationJobs.id, r.id))
          .returning();
        claimed.sends.push(u);
      } else {
        const [u] = await tx
          .update(notificationJobs)
          .set({ lockedUntil: lease, updatedAt: nowD })
          .where(eq(notificationJobs.id, r.id))
          .returning();
        claimed.verifies.push(u);
      }
    }
    return claimed;
  });
}

function retryDelayMs(attempts: number): number {
  const d = retryDelaysSeconds();
  return d[Math.min(Math.max(attempts - 1, 0), d.length - 1)] * 1000;
}

async function finish(db: Db, job: DbNotificationJob, result: SendResult, now: number) {
  if (result.kind === 'SENT') {
    return update(db, job.id, {
      status: 'SENT',
      sentAt: new Date(now),
      providerMessageId: result.messageId ?? null,
      lockedUntil: null,
      lastError: null,
    });
  }
  if (result.kind === 'UNKNOWN') {
    return update(db, job.id, {
      status: 'UNKNOWN',
      lockedUntil: null,
      verifyAttempts: 0,
      nextAttemptAt: new Date(now + verifyDelayMs()),
      lastError: result.error,
    });
  }
  const exhausted = job.attempts >= job.maxAttempts;
  return update(db, job.id, {
    status: exhausted ? 'FAILED' : 'QUEUED',
    lockedUntil: null,
    nextAttemptAt: new Date(now + retryDelayMs(job.attempts)),
    lastError: result.error,
  });
}

function skipReason(order: Order | null): string | null {
  if (!order) return 'Pesanan tidak ditemukan.';
  if (order.payment !== 'PAID') return 'Pesanan belum lunas.';
  if (FINAL_FULFILLMENT.includes(order.fulfillment)) {
    return `Pesanan sudah ${order.fulfillment === 'COMPLETED' ? 'selesai' : 'dibatalkan'}; pesan tidak dikirim.`;
  }
  return null;
}

async function deliver(db: Db, job: DbNotificationJob, now: number) {
  const order = await getOrderById(db, job.orderId);
  const skip = skipReason(order);
  if (skip) {
    return update(db, job.id, { status: 'CANCELLED', lockedUntil: null, lastError: skip });
  }
  if (!job.recipientPhone) {
    return update(db, job.id, {
      status: 'FAILED',
      lockedUntil: null,
      lastError: 'Tidak ada penerima aktif.',
    });
  }
  const text = buildKitchenOrderWhatsAppMessage(
    order!,
    { name: job.recipientName ?? 'penjaga' },
    { resend: job.kind === 'RESEND' }
  );
  const result = await sendWhatsAppText(getWahaConfig(), job.recipientPhone, text);
  return finish(db, job, result, now);
}

/** Putuskan nasib tugas UNKNOWN dengan memeriksa riwayat WA untuk nomor order. */
async function verifyUnknown(db: Db, job: DbNotificationJob, now: number) {
  const order = await getOrderById(db, job.orderId);
  const skip = skipReason(order);
  if (skip) return update(db, job.id, { status: 'CANCELLED', lockedUntil: null, lastError: skip });

  const cfg = getWahaConfig();
  try {
    if (!cfg || !job.recipientPhone) throw new Error('WAHA belum dikonfigurasi');
    // Riwayat chat tidak bisa dibaca selama sesi tidak WORKING (WAHA menahan lalu menolak).
    // Tunda tanpa menghabiskan jatah verifikasi; dicoba lagi setelah sesi aktif kembali.
    const session = await getSessionState(cfg);
    if (session.reachable && session.status !== 'WORKING' && session.status !== 'UNKNOWN') {
      return update(db, job.id, {
        status: 'UNKNOWN',
        lockedUntil: null,
        nextAttemptAt: new Date(now + verifyDelayMs()),
        lastError: `${(job.lastError ?? 'Hasil tidak diketahui').replace(/ \(menunggu sesi WhatsApp aktif.*\)$/, '')} (menunggu sesi WhatsApp aktif untuk verifikasi; status ${session.status})`,
      });
    }
    const found = await wasMessageSent(cfg, job.recipientPhone, order!.number, job.createdAt.getTime() - 60_000);
    if (found) {
      return update(db, job.id, {
        status: 'SENT',
        sentAt: new Date(now),
        lockedUntil: null,
        lastError: 'Terverifikasi terkirim dari riwayat WhatsApp.',
      });
    }
    // Riwayat terbaca dan pesan tidak ada: aman dikirim ulang (masih dalam batas percobaan).
    const exhausted = job.attempts >= job.maxAttempts;
    return update(db, job.id, {
      status: exhausted ? 'FAILED' : 'QUEUED',
      lockedUntil: null,
      nextAttemptAt: new Date(now),
      lastError: 'Tidak ditemukan di riwayat WhatsApp; dikirim ulang.',
    });
  } catch (err) {
    const verifyAttempts = job.verifyAttempts + 1;
    return update(db, job.id, {
      status: 'UNKNOWN',
      lockedUntil: null,
      verifyAttempts,
      nextAttemptAt: new Date(now + verifyDelayMs()),
      lastError:
        verifyAttempts >= MAX_VERIFY_ATTEMPTS
          ? `Verifikasi otomatis gagal (${(err as Error).message}). Periksa WhatsApp lalu kirim ulang manual bila belum terkirim.`
          : `${job.lastError ?? 'Hasil tidak diketahui'} (verifikasi ${verifyAttempts} gagal: ${(err as Error).message})`,
    });
  }
}

export interface ProcessSummary {
  paused: boolean;
  sent: number;
  failed: number;
  unknown: number;
  cancelled: number;
}

/**
 * Proses semua tugas yang jatuh tempo. Dijeda bila admin menandai WA terputus (waConnected=false):
 * tugas tetap QUEUED tanpa menghabiskan percobaan.
 */
export async function processDueJobs(
  db: Db,
  opts: { now?: number; limit?: number } = {}
): Promise<ProcessSummary> {
  const now = opts.now ?? Date.now();
  const summary: ProcessSummary = { paused: false, sent: 0, failed: 0, unknown: 0, cancelled: 0 };
  if (!(await getSettings(db)).waConnected) {
    summary.paused = true;
    return summary;
  }
  const claimed = await claimDue(db, now, opts.limit ?? 10);
  const tally = (j: DbNotificationJob) => {
    if (j.status === 'SENT') summary.sent++;
    else if (j.status === 'UNKNOWN') summary.unknown++;
    else if (j.status === 'CANCELLED') summary.cancelled++;
    else summary.failed++;
  };
  for (const job of claimed.sends) tally(await deliver(db, job, now));
  for (const job of claimed.verifies) tally(await verifyUnknown(db, job, now));
  return summary;
}

/** Proses segera, tetapi tidak menahan pemanggil (mis. webhook) lebih dari budgetMs. */
export async function kickWorker(db: Db, budgetMs = 3000): Promise<void> {
  try {
    await Promise.race([
      processDueJobs(db),
      new Promise<void>((resolve) => setTimeout(resolve, budgetMs).unref?.()),
    ]);
  } catch (err) {
    console.error('[wa-queue] Gagal memproses antrean:', err);
  }
}

/**
 * Kirim ulang manual oleh penjaga ke sif aktif SEKARANG (eksplisit, bukan order baru).
 * Bila tugas sebelumnya UNKNOWN, riwayat WA diperiksa dulu; jika pesan sudah ada, tidak mengirim ganda.
 */
export async function resendNotification(
  db: Db,
  orderId: string,
  now: number = Date.now()
): Promise<{ order: Order; alreadySent: boolean }> {
  const order = await getOrderById(db, orderId);
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  if (order.payment !== 'PAID') throw new HttpError(409, 'Notifikasi hanya dikirim untuk pesanan lunas.');
  if (FINAL_FULFILLMENT.includes(order.fulfillment)) {
    throw new HttpError(409, 'Pesanan sudah selesai/dibatalkan; tidak perlu dikirim ulang.');
  }

  const open = await db
    .select()
    .from(notificationJobs)
    .where(
      and(
        eq(notificationJobs.orderId, orderId),
        inArray(notificationJobs.status, ['QUEUED', 'SENDING', 'UNKNOWN'])
      )
    )
    .orderBy(desc(notificationJobs.id));

  if (open.some((j) => j.status === 'SENDING' && j.lockedUntil && j.lockedUntil.getTime() > now)) {
    throw new HttpError(409, 'Notifikasi sedang dikirim. Tunggu sebentar lalu cek statusnya.');
  }

  const unknown = open.find((j) => j.status === 'UNKNOWN');
  const cfg = getWahaConfig();
  if (unknown && cfg && unknown.recipientPhone) {
    try {
      if (await wasMessageSent(cfg, unknown.recipientPhone, order.number, unknown.createdAt.getTime() - 60_000)) {
        await update(db, unknown.id, {
          status: 'SENT',
          sentAt: new Date(now),
          lockedUntil: null,
          lastError: 'Terverifikasi terkirim dari riwayat WhatsApp.',
        });
        return { order: (await getOrderById(db, orderId))!, alreadySent: true };
      }
    } catch {
      // Riwayat tak terbaca: penjaga sudah memutuskan kirim ulang; pesan ditandai KIRIM ULANG.
    }
  }

  for (const j of open) {
    await db
      .update(notificationJobs)
      .set({ status: 'CANCELLED', lockedUntil: null, lastError: 'Digantikan kirim ulang manual.', updatedAt: new Date(now) })
      .where(eq(notificationJobs.id, j.id));
  }
  await insertJob(db, order, 'RESEND', await resolveRecipient(db), now);
  await kickWorker(db);
  return { order: (await getOrderById(db, orderId))!, alreadySent: false };
}
