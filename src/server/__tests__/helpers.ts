import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../db/schema';
import type { Db } from '../db';
import { seedDefaults } from '../repos/defaults';

/** Postgres in-memory (PGlite) dengan migrasi nyata dari ./drizzle dan data awal. */
export async function makeTestDb(seed = true): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  const typed = db as unknown as Db;
  if (seed) await seedDefaults(typed);
  return typed;
}
