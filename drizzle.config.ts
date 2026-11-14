import { defineConfig } from 'drizzle-kit';
import { normalizeDatabaseUrl } from './src/server/db/url';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? '') },
});
