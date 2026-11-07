/**
 * Koneksi database server-side. Dibuat lazy supaya `next build` tidak
 * membutuhkan DATABASE_URL; error baru muncul saat request benar-benar masuk.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL belum dikonfigurasi.');
  }
  const client = postgres(url, { max: 10, prepare: false });
  cached = drizzle(client, { schema }) as unknown as Db;
  return cached;
}

/** Khusus pengujian: ganti koneksi dengan instance lain (mis. PGlite). */
export function setDbForTesting(db: Db | null): void {
  cached = db;
}

export { schema };
