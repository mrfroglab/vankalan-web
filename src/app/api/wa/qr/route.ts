import { NextResponse, connection } from 'next/server';
import { requireAdmin } from '@/server/auth';
import { HttpError, handle } from '@/server/http';
import { fetchLoginQr, getWahaConfig } from '@/server/wa/waha';

/** QR login WhatsApp (PNG) untuk discan dari dashboard dapur. Khusus admin, tidak pernah di-cache. */
export const GET = handle(async (request: Request) => {
  requireAdmin(request);
  await connection();
  const cfg = getWahaConfig();
  if (!cfg) throw new HttpError(503, 'WAHA belum dikonfigurasi.');
  let png: Buffer | null;
  try {
    png = await fetchLoginQr(cfg);
  } catch {
    throw new HttpError(502, 'WAHA tidak dapat dihubungi.');
  }
  if (!png) throw new HttpError(409, 'Sesi WhatsApp tidak sedang menunggu scan QR.');
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
  });
});
