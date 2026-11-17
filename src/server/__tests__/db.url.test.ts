import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl } from '@/server/db/url';

describe('normalizeDatabaseUrl', () => {
  it('membuang ?schema=public bergaya Prisma (ditolak postgres.js)', () => {
    expect(normalizeDatabaseUrl('postgresql://u:p@vankalan-db:5432/vankalan_db?schema=public')).toBe(
      'postgresql://u:p@vankalan-db:5432/vankalan_db'
    );
  });

  it('mempertahankan parameter lain seperti sslmode', () => {
    expect(normalizeDatabaseUrl('postgresql://u:p@h/d?sslmode=require&schema=x&connection_limit=5')).toBe(
      'postgresql://u:p@h/d?sslmode=require'
    );
  });

  it('tidak mengubah URL tanpa query, membuang spasi dan tanda kutip dari env', () => {
    expect(normalizeDatabaseUrl('  postgresql://u:p@h/d ')).toBe('postgresql://u:p@h/d');
    expect(normalizeDatabaseUrl('"postgresql://u:p@h/d?schema=public"')).toBe('postgresql://u:p@h/d');
  });
});
