import { MenuItem, Shift, StoreSettings, Order } from '@/types';
import { INITIAL_MENU, INITIAL_SHIFTS } from '@/lib/constants';

const SETTINGS_KEY = 'pv_settings_v2';
const MENU_KEY = 'pv_menu_v2';
const CATEGORIES_KEY = 'pv_categories_v2';
const SHIFTS_KEY = 'pv_shifts_v2';
const ORDERS_KEY = 'pv_orders_v2';

export const DEFAULT_SETTINGS: StoreSettings = {
  open: true,
  estimate: 10,
  eggPrice: 4000,
  recipientShiftId: 's1',
  waConnected: true,
};

export const DEFAULT_CATEGORIES: string[] = ['Mi', 'Nasi', 'Camilan', 'Minuman'];

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function notifyStorageChange() {
  if (isClient()) {
    window.dispatchEvent(new Event('pv_storage_update'));
  }
}

export function createSeedOrders(): Order[] {
  const now = Date.now();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(now))
    .replace(/-/g, '');

  return [
    {
      id: 'ord_demo_1',
      token: 'tok_raka_001',
      number: `PV-${dateStr}-1041`,
      created: now - 12 * 60 * 1000,
      pickup: now + 6 * 60 * 1000,
      estimate: 10,
      mode: 'asap',
      name: 'Raka Pratama',
      phone: '6281234500011',
      note: 'Mi goreng jangan terlalu lembek ya mas.',
      payment: 'PAID',
      fulfillment: 'NEW',
      notification: 'SENT',
      recipientShiftId: 's1',
      items: [
        { name: 'Indomie Goreng', qty: 1, unit: 14000, egg: true, note: 'Pedas sedang' },
        { name: 'Teh Manis', qty: 1, unit: 5000, temp: 'Dingin', note: 'Manis sedang' },
      ],
      total: 19000,
      paidAt: now - 12 * 60 * 1000,
      attempts: 1,
    },
    {
      id: 'ord_demo_2',
      token: 'tok_nadia_002',
      number: `PV-${dateStr}-1042`,
      created: now - 22 * 60 * 1000,
      pickup: now + 15 * 60 * 1000,
      estimate: 10,
      mode: 'scheduled',
      name: 'Nadia Safitri',
      phone: '6281234500012',
      note: 'Kerupuknya dibanyakin kalau ada.',
      payment: 'PAID',
      fulfillment: 'PREPARING',
      notification: 'SENT',
      recipientShiftId: 's1',
      items: [
        { name: 'Nasi Goreng Kampung', qty: 1, unit: 18000 },
        { name: 'Kopi Susu', qty: 1, unit: 7000, temp: 'Dingin' },
      ],
      total: 25000,
      paidAt: now - 22 * 60 * 1000,
      attempts: 1,
    },
    {
      id: 'ord_demo_3',
      token: 'tok_sari_003',
      number: `PV-${dateStr}-1043`,
      created: now - 8 * 60 * 1000,
      pickup: now + 8 * 60 * 1000,
      estimate: 10,
      mode: 'asap',
      name: 'Sari Mulyani',
      phone: '6281234500013',
      note: 'Kuah banjir ya mas.',
      payment: 'PAID',
      fulfillment: 'NEW',
      notification: 'FAILED',
      recipientShiftId: 's1',
      items: [
        { name: 'Indomie Soto', qty: 1, unit: 14000, egg: true, note: 'Bawang goreng banyak' },
        { name: 'Jeruk Segar', qty: 1, unit: 7000, temp: 'Dingin' },
      ],
      total: 21000,
      paidAt: now - 8 * 60 * 1000,
      attempts: 1,
    },
    {
      id: 'ord_demo_4',
      token: 'tok_dimas_004',
      number: `PV-${dateStr}-1044`,
      created: now - 28 * 60 * 1000,
      pickup: now - 2 * 60 * 1000,
      estimate: 10,
      mode: 'asap',
      name: 'Dimas Wicaksono',
      phone: '6281234500014',
      payment: 'PAID',
      fulfillment: 'READY',
      notification: 'SENT',
      recipientShiftId: 's1',
      items: [
        { name: 'Mi Goreng Double', qty: 1, unit: 21000, egg: true, note: 'Pedas mampus' },
        { name: 'Teh Manis', qty: 2, unit: 5000, temp: 'Dingin' },
      ],
      total: 31000,
      paidAt: now - 28 * 60 * 1000,
      attempts: 1,
    },
    {
      id: 'ord_demo_5',
      token: 'tok_budi_005',
      number: `PV-${dateStr}-1045`,
      created: now - 45 * 60 * 1000,
      pickup: now - 35 * 60 * 1000,
      estimate: 10,
      mode: 'asap',
      name: 'Budi Handoko',
      phone: '6281234500015',
      payment: 'PAID',
      fulfillment: 'CANCELLED',
      cancelReason: 'Stok telur habis mendadak dan pelanggan minta dibatalkan.',
      refund: {
        status: 'PENDING',
        amount: 14000,
        reason: 'Menunggu konfirmasi rekening transfer BCA pelanggan.',
      },
      notification: 'SENT',
      recipientShiftId: 's1',
      items: [{ name: 'Nasi Telur Warmindo', qty: 1, unit: 14000 }],
      total: 14000,
      paidAt: now - 45 * 60 * 1000,
      attempts: 1,
    },
    {
      id: 'ord_demo_6',
      token: 'tok_fajar_006',
      number: `PV-${dateStr}-1046`,
      created: now - 80 * 60 * 1000,
      pickup: now - 65 * 60 * 1000,
      estimate: 10,
      mode: 'asap',
      name: 'Fajar Nugraha',
      phone: '6281234500016',
      payment: 'PAID',
      fulfillment: 'COMPLETED',
      notification: 'SENT',
      recipientShiftId: 's1',
      items: [
        { name: 'Roti Bakar Cokelat', qty: 1, unit: 12000 },
        { name: 'Kopi Susu', qty: 1, unit: 6000, temp: 'Panas' },
      ],
      total: 18000,
      paidAt: now - 80 * 60 * 1000,
      completedAt: now - 64 * 60 * 1000,
      attempts: 1,
    },
  ];
}

export function getStoreSettings(): StoreSettings {
  if (!isClient()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Gagal membaca store settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal menyimpan store settings', e);
  }
}

export function getMenuItems(): MenuItem[] {
  if (!isClient()) return INITIAL_MENU;
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Gagal membaca menu', e);
  }
  return INITIAL_MENU;
}

export function saveMenuItems(menu: MenuItem[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(MENU_KEY, JSON.stringify(menu));
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal menyimpan menu', e);
  }
}

export function getCategories(): string[] {
  if (!isClient()) return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Gagal membaca categories', e);
  }
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories: string[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal menyimpan categories', e);
  }
}

export function getShifts(): Shift[] {
  if (!isClient()) return INITIAL_SHIFTS;
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Gagal membaca shifts', e);
  }
  return INITIAL_SHIFTS;
}

export function saveShifts(shifts: Shift[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal menyimpan shifts', e);
  }
}

export function getOrders(): Order[] {
  if (!isClient()) return createSeedOrders();
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
    const fresh = createSeedOrders();
    localStorage.setItem(ORDERS_KEY, JSON.stringify(fresh));
    return fresh;
  } catch (e) {
    console.warn('Gagal membaca orders', e);
  }
  return createSeedOrders();
}

export function saveOrders(orders: Order[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal menyimpan orders', e);
  }
}

export function seedDemoOrders(): Order[] {
  const seeds = createSeedOrders();
  saveOrders(seeds);
  return seeds;
}

export function resetAllData(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(MENU_KEY);
    localStorage.removeItem(CATEGORIES_KEY);
    localStorage.removeItem(SHIFTS_KEY);
    const fresh = createSeedOrders();
    localStorage.setItem(ORDERS_KEY, JSON.stringify(fresh));
    localStorage.removeItem('pv_warmindo_cart_v2');
    notifyStorageChange();
  } catch (e) {
    console.warn('Gagal reset data', e);
  }
}
