/**
 * Pembatas percobaan login gagal (in-memory; cukup untuk satu instance container).
 * Dua lapis: per-IP dan global (agar spoofing X-Forwarded-For tidak melumpuhkan batas).
 * Jika kelak berjalan multi-instance, pindahkan ke Redis/DB.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_GLOBAL = 40;

const buckets = new Map<string, Bucket>();

function current(key: string, now: number): Bucket {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return b;
}

export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xff || request.headers.get('x-real-ip') || 'unknown';
}

/** Detik tunggu bila diblokir, atau 0 bila boleh mencoba. */
export function loginRetryAfter(ip: string, now: number = Date.now()): number {
  const ipB = current(`ip:${ip}`, now);
  const gB = current('global', now);
  const blocked = [
    ipB.count >= MAX_PER_IP ? ipB.resetAt : 0,
    gB.count >= MAX_GLOBAL ? gB.resetAt : 0,
  ].filter(Boolean);
  return blocked.length ? Math.ceil((Math.max(...blocked) - now) / 1000) : 0;
}

export function recordLoginFailure(ip: string, now: number = Date.now()): void {
  current(`ip:${ip}`, now).count++;
  current('global', now).count++;
}

export function resetLoginFailures(ip: string): void {
  buckets.delete(`ip:${ip}`);
}

/** Khusus tes. */
export function _clearRateLimits(): void {
  buckets.clear();
}
