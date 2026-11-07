/**
 * Pekerja latar belakang (satu per proses server): memproses antrean WA yang jatuh tempo dan
 * merekonsiliasi pembayaran PENDING secara berkala (PRD FR-27, FR-34).
 * Aman dijalankan di beberapa instance: klaim tugas memakai FOR UPDATE SKIP LOCKED + lease.
 *
 * Env: WA_WORKER_ENABLED=false untuk mematikan; WA_WORKER_INTERVAL_MS (default 10000).
 */

import { getDb } from '../db';
import { getMidtransConfig } from '../payments/midtrans';
import { reconcilePending } from '../payments/service';
import { processDueJobs } from './queue';

const RECONCILE_EVERY_MS = 2 * 60 * 1000;

type WorkerGlobal = typeof globalThis & { __pvWorker?: ReturnType<typeof setInterval> };

export function startWorker(): void {
  const g = globalThis as WorkerGlobal;
  if (g.__pvWorker) return; // idempoten (HMR/dev memanggil register berulang)
  if (process.env.WA_WORKER_ENABLED === 'false' || !process.env.DATABASE_URL) return;

  const configured = Number(process.env.WA_WORKER_INTERVAL_MS);
  const interval = Number.isFinite(configured) && configured >= 2000 ? configured : 10_000;
  const reconcileEveryTicks = Math.max(1, Math.round(RECONCILE_EVERY_MS / interval));

  let running = false;
  let ticks = 0;
  g.__pvWorker = setInterval(async () => {
    if (running) return; // jangan menumpuk bila tick sebelumnya lambat
    running = true;
    try {
      const db = getDb();
      await processDueJobs(db);
      if (++ticks % reconcileEveryTicks === 0) {
        const cfg = getMidtransConfig();
        if (cfg) await reconcilePending(db, cfg);
      }
    } catch (err) {
      console.error('[worker] Tick gagal:', err);
    } finally {
      running = false;
    }
  }, interval);
  g.__pvWorker.unref?.();
  console.log(`[worker] Antrean WA & rekonsiliasi pembayaran aktif (setiap ${interval / 1000} dtk).`);
}
