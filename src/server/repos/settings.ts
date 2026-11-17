/** Akses data: kategori, menu, sif, dan pengaturan toko. */

import { asc, eq } from 'drizzle-orm';
import type { MenuItem, Shift, StoreSettings } from '@/types';
import { HttpError } from '../http';
import type { Db } from '../db';
import { categories, menuItems, shifts, storeSettings, type DbMenuItem } from '../db/schema';

function toMenuItem(r: DbMenuItem): MenuItem {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    category: r.category,
    kind: r.kind as MenuItem['kind'],
    available: r.available,
    ...(r.egg ? { egg: true } : {}),
    ...(r.popular ? { popular: true } : {}),
    ...(r.temperatures ? { temperatures: r.temperatures } : {}),
    ...(r.coldExtra != null ? { coldExtra: r.coldExtra } : {}),
    ...(r.image ? { image: r.image } : {}),
    ...(r.rating != null ? { rating: r.rating } : {}),
    ...(r.reviewsCount != null ? { reviewsCount: r.reviewsCount } : {}),
    ...(r.prepTime != null ? { prepTime: r.prepTime } : {}),
    ...(r.badge ? { badge: r.badge as MenuItem['badge'] } : {}),
    ...(r.portion ? { portion: r.portion as MenuItem['portion'] } : {}),
    ...(r.mealTime ? { mealTime: r.mealTime as MenuItem['mealTime'] } : {}),
  };
}

export async function listMenu(db: Db): Promise<MenuItem[]> {
  const rows = await db.select().from(menuItems).orderBy(asc(menuItems.sortOrder));
  return rows.map(toMenuItem);
}

export async function replaceMenu(db: Db, items: MenuItem[]): Promise<MenuItem[]> {
  await db.transaction(async (tx) => {
    await tx.delete(menuItems);
    await tx.insert(menuItems).values(
      items.map((m, i) => ({
        id: m.id,
        name: m.name,
        description: m.description ?? '',
        price: m.price,
        category: String(m.category),
        kind: m.kind,
        available: m.available,
        egg: Boolean(m.egg),
        popular: Boolean(m.popular),
        temperatures: m.temperatures ?? null,
        coldExtra: m.coldExtra ?? null,
        image: m.image ?? null,
        rating: m.rating ?? null,
        reviewsCount: m.reviewsCount ?? null,
        prepTime: m.prepTime ?? null,
        badge: m.badge ?? null,
        portion: m.portion ?? null,
        mealTime: m.mealTime ?? null,
        sortOrder: i,
      }))
    );
  });
  return listMenu(db);
}

export async function listCategories(db: Db): Promise<string[]> {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return rows.map((r) => r.name);
}

export async function replaceCategories(db: Db, names: string[]): Promise<string[]> {
  await db.transaction(async (tx) => {
    await tx.delete(categories);
    if (names.length > 0) {
      await tx.insert(categories).values(names.map((name, i) => ({ name, sortOrder: i })));
    }
  });
  return listCategories(db);
}

export async function listShifts(db: Db): Promise<Shift[]> {
  const rows = await db.select().from(shifts).orderBy(asc(shifts.sortOrder));
  return rows.map(({ id, name, phone }) => ({ id, name, phone }));
}

/** Ganti seluruh daftar sif; jika penerima aktif ikut terhapus, pindahkan ke sif pertama. */
export async function replaceShifts(db: Db, list: Shift[]): Promise<Shift[]> {
  await db.transaction(async (tx) => {
    await tx.delete(shifts);
    if (list.length > 0) {
      await tx.insert(shifts).values(list.map((s, i) => ({ ...s, sortOrder: i })));
    }
    const [settings] = await tx.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (settings && !list.some((s) => s.id === settings.recipientShiftId)) {
      await tx
        .update(storeSettings)
        .set({ recipientShiftId: list[0]?.id ?? null, updatedAt: new Date() })
        .where(eq(storeSettings.id, 1));
    }
  });
  return listShifts(db);
}

const DEFAULTS = { open: true, estimate: 10, eggPrice: 4000, waConnected: true };

function toSettings(r: typeof storeSettings.$inferSelect | undefined): StoreSettings {
  return {
    open: r?.open ?? DEFAULTS.open,
    estimate: r?.estimate ?? DEFAULTS.estimate,
    eggPrice: r?.eggPrice ?? DEFAULTS.eggPrice,
    recipientShiftId: r?.recipientShiftId ?? '',
    waConnected: r?.waConnected ?? DEFAULTS.waConnected,
  };
}

export async function getSettings(db: Db): Promise<StoreSettings> {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
  return toSettings(row);
}

export async function patchSettings(
  db: Db,
  patch: Partial<StoreSettings>
): Promise<StoreSettings> {
  if (patch.recipientShiftId) {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, patch.recipientShiftId));
    if (!shift) throw new HttpError(400, 'Sif penerima tidak ditemukan.');
  }
  const { recipientShiftId, ...rest } = patch;
  const values = {
    ...rest,
    // String kosong dari klien berarti "tidak ada"; simpan sebagai NULL.
    ...(recipientShiftId !== undefined ? { recipientShiftId: recipientShiftId || null } : {}),
    updatedAt: new Date(),
  };
  await db
    .insert(storeSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: storeSettings.id, set: values });
  return getSettings(db);
}
