import { z } from 'zod';
import { getDb } from '@/server/db';
import { HttpError, handle, json, parseBody } from '@/server/http';
import { getMidtransConfig, verifySignature } from '@/server/payments/midtrans';
import { applyAndNotify } from '@/server/payments/service';

const notificationSchema = z
  .object({
    order_id: z.string().min(1).max(100),
    status_code: z.string().min(1).max(10),
    gross_amount: z.string().min(1).max(30),
    signature_key: z.string().min(1).max(256),
    transaction_status: z.string().max(40).optional(),
    fraud_status: z.string().max(40).optional(),
    transaction_id: z.string().max(100).optional(),
    payment_type: z.string().max(60).optional(),
  })
  .passthrough();

/**
 * Webhook Midtrans (publik; keaslian dibuktikan oleh signature_key).
 * Midtrans mencoba ulang pada non-2xx, jadi: signature salah = 403 (tak perlu retry),
 * order tak dikenal / nominal tak cocok = 200 (dicatat, tidak ada efek), error internal = 500 (retry).
 */
export const POST = handle(async (request: Request) => {
  const cfg = getMidtransConfig();
  if (!cfg) throw new HttpError(503, 'Pembayaran online belum dikonfigurasi.');

  const payload = await parseBody(request, notificationSchema);
  if (!verifySignature(payload, cfg.serverKey)) {
    throw new HttpError(403, 'Signature tidak valid.');
  }

  const result = await applyAndNotify(getDb(), payload, 'webhook');
  return json({ ok: true, result: result.result });
});
