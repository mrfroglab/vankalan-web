import { z } from 'zod';

export function normalizeIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s()+-]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

export const checkoutFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama pemesan minimal 2 karakter.'),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndonesianPhone)
    .refine((val) => /^62\d{8,13}$/.test(val), {
      message: 'Masukkan nomor WhatsApp Indonesia yang valid, misalnya 081234567890.',
    }),
  note: z.string().trim().max(300, 'Catatan maksimal 300 karakter.').optional(),
  mode: z.enum(['asap', 'scheduled']),
  pickupTimestamp: z.number().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
