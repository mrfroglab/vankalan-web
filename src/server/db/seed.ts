/**
 * Isi data awal: kategori, menu, sif, pengaturan (dan order demo dengan --demo-orders).
 * Jalankan: pnpm db:seed [-- --demo-orders]
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import type { Db } from './index';
import { seedDefaults } from '../repos/defaults';
import { replaceOrdersWithSeed } from '../repos/orders';
import { createSeedOrders } from '@/lib/store';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diatur.');
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema }) as unknown as Db;
  try {
    await seedDefaults(db);
    console.log('Seed default (kategori, menu, sif, pengaturan) selesai.');
    if (process.argv.includes('--demo-orders')) {
      await replaceOrdersWithSeed(db, createSeedOrders());
      console.log('Order demo dimuat.');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
