/** Skema Zod untuk body request API. Frontend tetap memakai tipe di src/types. */

import { z } from 'zod';
import { normalizeIndonesianPhone } from '@/lib/validations/order';

const phoneSchema = z
  .string()
  .trim()
  .transform(normalizeIndonesianPhone)
  .refine((v) => /^62\d{8,13}$/.test(v), 'Nomor WhatsApp Indonesia tidak valid.');

const temp = z.enum(['Panas', 'Dingin']);

export const orderItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(50),
  unit: z.number().int().min(0),
  egg: z.boolean().optional(),
  temp: temp.optional(),
  note: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  name: z.string().trim().min(2, 'Nama pemesan minimal 2 karakter.').max(80),
  phone: phoneSchema,
  mode: z.enum(['asap', 'scheduled']),
  pickup: z.number().finite(),
  estimate: z.number().int().min(0),
  items: z.array(orderItemSchema).min(1),
  total: z.number().int().min(0),
  note: z.string().trim().max(300).optional(),
  // Diterima demi kompatibilitas klien, tapi diabaikan: penerima ditentukan server.
  recipientShiftId: z.string().optional(),
});

export const menuItemSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).default(''),
  price: z.number().int().min(0),
  category: z.string().trim().min(1).max(60),
  kind: z.enum(['noodle', 'soup', 'rice', 'toast', 'tea', 'coffee', 'orange']),
  available: z.boolean(),
  egg: z.boolean().optional(),
  popular: z.boolean().optional(),
  temperatures: z.array(temp).optional(),
  coldExtra: z.number().int().min(0).optional(),
  image: z.string().max(1000).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).optional(),
  prepTime: z.number().int().min(0).optional(),
  badge: z.enum(['FAVORIT', 'BARU', 'TERLARIS']).optional(),
  portion: z.enum(['Reguler', 'Double', 'Jumbo']).optional(),
  mealTime: z.array(z.enum(['Sarapan', 'Snacks', 'Makan Malam', 'Larut Malam'])).optional(),
});

export const putMenuSchema = z
  .object({ items: z.array(menuItemSchema).min(1, 'Menu tidak boleh kosong.') })
  .superRefine((v, ctx) => {
    const ids = new Set<string>();
    const names = new Set<string>();
    v.items.forEach((it, i) => {
      if (ids.has(it.id)) ctx.addIssue({ code: 'custom', path: ['items', i, 'id'], message: 'ID menu duplikat.' });
      // Nama dipakai server untuk mencocokkan item keranjang, jadi harus unik.
      if (names.has(it.name)) ctx.addIssue({ code: 'custom', path: ['items', i, 'name'], message: 'Nama menu harus unik.' });
      ids.add(it.id);
      names.add(it.name);
    });
  });

export const putCategoriesSchema = z.object({
  categories: z
    .array(z.string().trim().min(1).max(60))
    .refine((c) => new Set(c).size === c.length, 'Kategori duplikat.'),
});

export const putShiftsSchema = z
  .object({
    shifts: z.array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        phone: phoneSchema,
      })
    ),
  })
  .refine((v) => new Set(v.shifts.map((s) => s.id)).size === v.shifts.length, 'ID sif duplikat.');

export const patchSettingsSchema = z.object({
  open: z.boolean().optional(),
  estimate: z.number().int().min(0).max(240).optional(),
  eggPrice: z.number().int().min(0).max(100000).optional(),
  recipientShiftId: z.string().max(64).optional(),
  waConnected: z.boolean().optional(),
});

export const statusSchema = z.object({
  fulfillment: z.enum(['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
});

export const paymentSchema = z.object({
  payment: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED']),
});

export const cancelSchema = z.object({ reason: z.string().trim().min(1).max(300) });

export const refundSchema = z.object({
  status: z.enum(['NONE', 'PENDING', 'PARTIAL_REFUNDED', 'FULL_REFUNDED']),
  amount: z.number().int().min(0),
  reason: z.string().max(300).default(''),
  confirmedAt: z.number().optional(),
});
