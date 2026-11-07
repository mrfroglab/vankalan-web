/**
 * Skema database PostgreSQL (Drizzle ORM) untuk Warmindo Putra Vangkalan.
 *
 * Catatan desain:
 * - Semua uang disimpan sebagai integer rupiah (tanpa desimal).
 * - Waktu disimpan sebagai timestamptz; lapisan mapper mengubahnya ke epoch ms
 *   supaya kontrak JSON ke frontend tidak berubah.
 * - Status pembayaran, pemenuhan pesanan, dan notifikasi dipisah (PRD bagian 9.1).
 * - Refund disimpan di tabel terpisah dari pembayaran (PRD FR/14.4).
 */

import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categories = pgTable('categories', {
  name: text('name').primaryKey(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    price: integer('price').notNull(),
    // Sengaja bukan FK: PUT /api/menu dan PUT /api/categories menyimpan daftar utuh
    // secara terpisah, sehingga urutan penyimpanan tidak boleh memicu pelanggaran FK.
    category: text('category').notNull(),
    kind: text('kind').notNull(),
    available: boolean('available').notNull().default(true),
    egg: boolean('egg').notNull().default(false),
    popular: boolean('popular').notNull().default(false),
    temperatures: jsonb('temperatures').$type<('Panas' | 'Dingin')[]>(),
    coldExtra: integer('cold_extra'),
    image: text('image'),
    rating: real('rating'),
    reviewsCount: integer('reviews_count'),
    prepTime: integer('prep_time'),
    badge: text('badge'),
    portion: text('portion'),
    mealTime: jsonb('meal_time').$type<string[]>(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [check('menu_items_price_nonneg', sql`${t.price} >= 0`)]
);

export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/** Tabel satu baris (id selalu 1) berisi pengaturan toko. */
export const storeSettings = pgTable(
  'store_settings',
  {
    id: integer('id').primaryKey().default(1),
    open: boolean('open').notNull().default(true),
    estimate: integer('estimate').notNull().default(10),
    eggPrice: integer('egg_price').notNull().default(4000),
    recipientShiftId: text('recipient_shift_id'),
    waConnected: boolean('wa_connected').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('store_settings_singleton', sql`${t.id} = 1`)]
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    /** Token privat tak-tertebak untuk tautan pelacakan pelanggan. */
    token: text('token').notNull(),
    number: text('number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    pickupAt: timestamp('pickup_at', { withTimezone: true }).notNull(),
    estimate: integer('estimate').notNull(),
    mode: text('mode').notNull().$type<'asap' | 'scheduled'>(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    note: text('note'),
    paymentStatus: text('payment_status').notNull().default('PENDING'),
    fulfillmentStatus: text('fulfillment_status').notNull().default('NEW'),
    notificationStatus: text('notification_status').notNull().default('QUEUED'),
    recipientShiftId: text('recipient_shift_id').notNull(),
    total: integer('total').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    attempts: integer('attempts').notNull().default(0),
    snapToken: text('snap_token'),
    /** Pembayaran masuk terlambat sehingga waktu ambil terjadwal tak lagi cukup; penjaga perlu menghubungi pelanggan. */
    needsTimeConfirmation: boolean('needs_time_confirmation').notNull().default(false),
  },
  (t) => [
    uniqueIndex('orders_token_uq').on(t.token),
    uniqueIndex('orders_number_uq').on(t.number),
    index('orders_created_idx').on(t.createdAt),
    index('orders_fulfillment_idx').on(t.fulfillmentStatus),
    check('orders_total_nonneg', sql`${t.total} >= 0`),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    qty: integer('qty').notNull(),
    unit: integer('unit').notNull(),
    egg: boolean('egg'),
    temp: text('temp').$type<'Panas' | 'Dingin'>(),
    note: text('note'),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    check('order_items_qty_pos', sql`${t.qty} > 0`),
  ]
);

/** Satu baris per percobaan pembayaran (order_id Midtrans unik per percobaan). */
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: serial('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    attempt: integer('attempt').notNull(),
    /** order_id yang dikirim ke Midtrans: `${nomor order}-${attempt}`. */
    midtransOrderId: text('midtrans_order_id').notNull(),
    /** Status ternormalisasi: PENDING | PAID | FAILED | EXPIRED. */
    status: text('status').notNull().default('PENDING'),
    grossAmount: integer('gross_amount').notNull(),
    snapToken: text('snap_token'),
    redirectUrl: text('redirect_url'),
    midtransTransactionId: text('midtrans_transaction_id'),
    paymentType: text('payment_type'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payment_tx_midtrans_order_uq').on(t.midtransOrderId),
    uniqueIndex('payment_tx_order_attempt_uq').on(t.orderId, t.attempt),
    index('payment_tx_status_idx').on(t.status),
  ]
);

/** Log append-only setiap notifikasi/cek status gateway (audit & investigasi). */
export const paymentEvents = pgTable(
  'payment_events',
  {
    id: serial('id').primaryKey(),
    midtransOrderId: text('midtrans_order_id').notNull(),
    orderId: text('order_id'),
    source: text('source').notNull(), // webhook | status_api | timeout
    transactionStatus: text('transaction_status'),
    fraudStatus: text('fraud_status'),
    statusCode: text('status_code'),
    grossAmount: text('gross_amount'),
    /** applied | noop | ignored | amount_mismatch | unknown_order | duplicate_payment | late_after_cancel */
    result: text('result').notNull(),
    raw: jsonb('raw'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payment_events_order_idx').on(t.midtransOrderId)]
);

/** Catatan refund manual; satu baris per order, terpisah dari status pembayaran. */
export const refunds = pgTable('refunds', {
  orderId: text('order_id')
    .primaryKey()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  amount: integer('amount').notNull().default(0),
  reason: text('reason').notNull().default(''),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

/** Penghitung nomor urut harian untuk nomor order PV-YYYYMMDD-NNNN (atomik via upsert). */
export const orderCounters = pgTable(
  'order_counters',
  {
    day: text('day').notNull(),
    last: integer('last').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day] })]
);

export type DbMenuItem = typeof menuItems.$inferSelect;
export type DbOrder = typeof orders.$inferSelect;
export type DbOrderItem = typeof orderItems.$inferSelect;
export type DbRefund = typeof refunds.$inferSelect;
export type DbPaymentTransaction = typeof paymentTransactions.$inferSelect;
