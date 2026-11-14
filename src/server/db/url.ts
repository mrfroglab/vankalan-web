/**
 * Rapikan DATABASE_URL sebelum diberikan ke postgres.js / drizzle-kit.
 *
 * postgres.js meneruskan query parameter yang tidak dikenalnya sebagai parameter koneksi ke
 * server, sehingga URL bergaya Prisma (`?schema=public`, seperti .env produksi lama) ditolak:
 * `unrecognized configuration parameter "schema"`. Parameter khusus Prisma dibuang; sisanya
 * (mis. `sslmode`) dipertahankan. Dibuat tanpa dependensi supaya bisa dipakai drizzle.config.ts.
 */
const PRISMA_ONLY_PARAMS = new Set(['schema', 'connection_limit', 'pool_timeout', 'pgbouncer', 'statement_cache_size']);

export function normalizeDatabaseUrl(raw: string): string {
  const url = raw.trim().replace(/^"(.*)"$/, '$1');
  const q = url.indexOf('?');
  if (q === -1) return url;
  const kept = url
    .slice(q + 1)
    .split('&')
    .filter((part) => part !== '' && !PRISMA_ONLY_PARAMS.has(decodeURIComponent(part.split('=')[0])));
  return kept.length ? `${url.slice(0, q)}?${kept.join('&')}` : url.slice(0, q);
}
