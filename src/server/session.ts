/**
 * Sesi admin stateless: cookie bertanda tangan HMAC-SHA256 (tanpa dependency tambahan).
 * Token = base64url(payload JSON) + "." + base64url(HMAC). Payload hanya berisi masa berlaku.
 *
 * Env:
 * - ADMIN_PASSWORD : kata sandi admin bersama (PRD TBD-05 belum memutuskan akun per penjaga).
 * - SESSION_SECRET : kunci penanda tangan, minimal 32 karakter (openssl rand -base64 48).
 * Mengganti SESSION_SECRET membatalkan semua sesi yang ada.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'pv_admin';
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // satu sif

function secret(): string | null {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim() && secret());
}

function sign(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function createSessionToken(now: number = Date.now()): string {
  const key = secret();
  if (!key) throw new Error('SESSION_SECRET belum dikonfigurasi (minimal 32 karakter).');
  const payload = Buffer.from(
    JSON.stringify({ v: 1, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })
  ).toString('base64url');
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, mac] = parts;
  if (!safeEqual(mac, sign(payload, key))) return false;
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return v === 1 && typeof exp === 'number' && exp * 1000 > now;
  } catch {
    return false;
  }
}

/** Bandingkan kata sandi waktu-konstan (di-hash dulu agar panjang tidak bocor). */
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(input), h(expected));
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export { safeNextPath } from '@/lib/safeNext';
