/**
 * Klien server untuk Midtrans (Snap + Status API).
 * Diperiksa terhadap docs.midtrans.com:
 * - signature_key = SHA512(order_id + status_code + gross_amount + SignatureKey)
 *   Akun Midtrans baru (dashboard 2026) memakai server key ber-scope untuk API dan
 *   "Signature Secret Key" terpisah untuk signature; akun lama memakai server key untuk keduanya.
 *   Diuji 2026-11-18 di sandbox: signature status API cocok dengan Signature Secret Key, bukan server key.
 * - Snap: POST {snap}/snap/v1/transactions, Basic auth (serverKey sebagai user, password kosong)
 * - Status: GET {core}/v2/{order_id}/status; 404 sampai pelanggan memilih metode bayar
 * - gross_amount di notifikasi berupa string desimal, mis. "14000.00"
 * Host produksi bisa dioverride lewat env bila Midtrans mengubahnya.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../http';

export interface MidtransConfig {
  serverKey: string;
  /** Kunci untuk memverifikasi signature_key (MIDTRANS_SIGNATURE_KEY, default = serverKey). */
  signatureKey: string;
  isProduction: boolean;
  snapUrl: string;
  coreApiUrl: string;
  expiryMinutes: number;
}

/** null bila MIDTRANS_SERVER_KEY belum diatur (mode simulasi/dev). */
export function getMidtransConfig(): MidtransConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey || serverKey === 'your-midtrans-server-key') return null;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const expiry = Number(process.env.MIDTRANS_EXPIRY_MINUTES);
  return {
    serverKey,
    signatureKey: process.env.MIDTRANS_SIGNATURE_KEY?.trim() || serverKey,
    isProduction,
    snapUrl:
      process.env.MIDTRANS_SNAP_API_URL?.trim() ||
      (isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'),
    coreApiUrl:
      process.env.MIDTRANS_CORE_API_URL?.trim() ||
      (isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'),
    // Batas durasi bayar harus dikonfigurasi (PRD 5.2/TBD-02); default 15 menit untuk pickup.
    expiryMinutes: Number.isInteger(expiry) && expiry >= 1 && expiry <= 1440 ? expiry : 15,
  };
}

/** Bentuk minimum notifikasi/respons status yang kita gunakan. */
export interface MidtransStatusPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  [key: string]: unknown;
}

export function computeSignature(
  p: Pick<MidtransStatusPayload, 'order_id' | 'status_code' | 'gross_amount'>,
  signatureKey: string
): string {
  return createHash('sha512')
    .update(`${p.order_id}${p.status_code}${p.gross_amount}${signatureKey}`)
    .digest('hex');
}

export function verifySignature(p: MidtransStatusPayload, signatureKey: string): boolean {
  if (typeof p.signature_key !== 'string') return false;
  const expected = Buffer.from(computeSignature(p, signatureKey));
  const given = Buffer.from(p.signature_key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** "14000.00" -> 14000. null bila bukan bilangan rupiah bulat yang valid. */
export function parseGrossAmount(value: unknown): number | null {
  const str = typeof value === 'number' ? String(value) : value;
  if (typeof str !== 'string' || !/^\d+(\.0+)?$/.test(str.trim())) return null;
  const n = Number(str.trim());
  return Number.isSafeInteger(n) ? n : null;
}

function basicAuth(serverKey: string): string {
  return 'Basic ' + Buffer.from(`${serverKey}:`).toString('base64');
}

export interface SnapParams {
  midtransOrderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  items: { name: string; qty: number; unit: number }[];
  finishUrl?: string;
  expiryMinutes: number;
}

export interface SnapResult {
  token: string;
  redirectUrl: string;
}

export async function createSnapTransaction(
  cfg: MidtransConfig,
  params: SnapParams
): Promise<SnapResult> {
  const body = {
    transaction_details: { order_id: params.midtransOrderId, gross_amount: params.amount },
    item_details: params.items.map((it, i) => ({
      id: `item-${i + 1}`,
      name: it.name.slice(0, 50),
      price: it.unit,
      quantity: it.qty,
    })),
    customer_details: { first_name: params.customerName.slice(0, 50), phone: params.customerPhone },
    expiry: { unit: 'minutes', duration: params.expiryMinutes },
    ...(params.finishUrl ? { callbacks: { finish: params.finishUrl } } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${cfg.snapUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: basicAuth(cfg.serverKey),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[midtrans] Snap request gagal:', err);
    throw new HttpError(502, 'Gagal menghubungi layanan pembayaran. Coba lagi sebentar.');
  }

  const data = (await res.json().catch(() => null)) as
    | { token?: string; redirect_url?: string; error_messages?: string[] }
    | null;
  if (!res.ok || !data?.token || !data.redirect_url) {
    console.error('[midtrans] Snap menolak transaksi:', res.status, data?.error_messages);
    throw new HttpError(502, 'Layanan pembayaran menolak permintaan. Coba lagi sebentar.');
  }
  return { token: data.token, redirectUrl: data.redirect_url };
}

/**
 * Ambil status resmi dari Midtrans. Mengembalikan null bila transaksi belum ada di sisi
 * Midtrans (404: pelanggan belum memilih metode bayar). Respons diverifikasi signature-nya.
 */
export async function fetchTransactionStatus(
  cfg: MidtransConfig,
  midtransOrderId: string
): Promise<MidtransStatusPayload | null> {
  const res = await fetch(`${cfg.coreApiUrl}/v2/${encodeURIComponent(midtransOrderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: basicAuth(cfg.serverKey) },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => null)) as MidtransStatusPayload | null;
  // Midtrans membalas HTTP 200 dengan status_code "404" di body untuk transaksi belum ada.
  if (res.status === 404 || data?.status_code === '404') return null;
  if (!res.ok || !data || typeof data.order_id !== 'string') {
    throw new Error(`Midtrans status API error (HTTP ${res.status})`);
  }
  if (data.signature_key !== undefined && !verifySignature(data, cfg.signatureKey)) {
    throw new Error('Signature respons status Midtrans tidak valid.');
  }
  return data;
}
