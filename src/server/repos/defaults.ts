/** Data awal (menu, kategori, sif, pengaturan) dari konstanta aplikasi. */

import { INITIAL_MENU, INITIAL_SHIFTS } from '@/lib/constants';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/lib/store';
import type { Db } from '../db';
import {
  patchSettings,
  replaceCategories,
  replaceMenu,
  replaceShifts,
} from './settings';

export async function seedDefaults(db: Db): Promise<void> {
  await replaceCategories(db, DEFAULT_CATEGORIES);
  await replaceMenu(db, INITIAL_MENU);
  await replaceShifts(db, INITIAL_SHIFTS);
  await patchSettings(db, DEFAULT_SETTINGS);
}
