/**
 * Klien WAHA (WhatsApp HTTP API) sisi server. Kredensial hanya di backend (PRD FR-37).
 * Diperiksa terhadap waha.devlike.pro:
 * - POST /api/sendText {session, chatId, text}; chatId = nomor tanpa "+" + "@c.us"
 * - GET /api/sessions/{session} -> status STOPPED|STARTING|SCAN_QR_CODE|WORKING|FAILED
 * - GET /api/{session}/chats/{chatId}/messages?limit&downloadMedia&filter.fromMe
 * - Header API key: X-Api-Key. Bentuk respons sendText tidak terdokumentasi -> id dibaca defensif.
 *
 * Hasil kirim dibedakan tegas, karena retry buta bisa menggandakan pesan:
 * - SENT    : WAHA menerima (2xx). Bukan jaminan dibaca penjaga.
 * - FAILED  : pasti tidak terkirim (belum terhubung / ditolak WAHA) -> aman di-retry.
 * - UNKNOWN : permintaan mungkin sudah sampai (timeout/putus di tengah) -> periksa riwayat dulu.
 */

export interface WahaConfig {
  baseUrl: string;
  session: string;
  apiKey?: string;
  timeoutMs: number;
}

export function getWahaConfig(): WahaConfig | null {
  const baseUrl = process.env.WAHA_BASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) return null;
  const timeout = Number(process.env.WAHA_TIMEOUT_MS);
  return {
    baseUrl,
    session: process.env.WAHA_SESSION?.trim() || 'default',
    apiKey: process.env.WAHA_API_KEY?.trim() || undefined,
    // WAHA asli menahan sendText ~10 dtk menunggu sesi WORKING sebelum menjawab 422; timeout
    // harus lebih panjang dari itu supaya penolakan pasti tidak terbaca sebagai UNKNOWN.
    timeoutMs: Number.isInteger(timeout) && timeout >= 1000 ? timeout : 20_000,
  };
}

export type SendResult =
  | { kind: 'SENT'; messageId?: string }
  | { kind: 'FAILED'; error: string }
  | { kind: 'UNKNOWN'; error: string };

const headers = (cfg: WahaConfig): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(cfg.apiKey ? { 'X-Api-Key': cfg.apiKey } : {}),
});

export function toChatId(phone: string): string {
  return phone.includes('@') ? phone : `${phone}@c.us`;
}

/** Kode error jaringan yang berarti koneksi tidak pernah terbentuk (pasti belum terkirim). */
const NEVER_CONNECTED = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH']);

function errorCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.cause?.code ?? e?.code;
}

function extractMessageId(data: unknown): string | undefined {
  const id = (data as { id?: unknown } | null)?.id;
  if (typeof id === 'string') return id;
  const o = id as { _serialized?: string; id?: string } | undefined;
  return o?._serialized ?? o?.id ?? undefined;
}

export async function sendWhatsAppText(
  cfg: WahaConfig | null,
  phone: string,
  text: string
): Promise<SendResult> {
  if (!cfg) return { kind: 'FAILED', error: 'WAHA belum dikonfigurasi (WAHA_BASE_URL).' };

  // Cek sesi dulu (cepat): bila jelas tidak WORKING, sendText belum dipanggil sama sekali,
  // jadi hasilnya pasti FAILED dan aman di-retry. Status yang tidak terbaca tidak menghalangi kirim.
  const session = await getSessionState(cfg);
  if (session.reachable && session.status !== 'WORKING' && session.status !== 'UNKNOWN') {
    return {
      kind: 'FAILED',
      error: `Sesi WhatsApp tidak aktif (status ${session.status})${session.needsQr ? '; scan QR ulang di dashboard WAHA' : ''}.`,
    };
  }
  if (!session.reachable && session.code && NEVER_CONNECTED.has(session.code)) {
    return { kind: 'FAILED', error: `WAHA tidak dapat dihubungi (${session.code}).` };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/sendText`, {
      method: 'POST',
      headers: headers(cfg),
      body: JSON.stringify({ session: cfg.session, chatId: toChatId(phone), text }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (err) {
    const code = errorCode(err);
    if (code && NEVER_CONNECTED.has(code)) {
      return { kind: 'FAILED', error: `WAHA tidak dapat dihubungi (${code}).` };
    }
    const name = (err as { name?: string })?.name;
    return {
      kind: 'UNKNOWN',
      error:
        name === 'TimeoutError' || name === 'AbortError'
          ? `WAHA tidak merespons dalam ${cfg.timeoutMs / 1000} detik; hasil tidak diketahui.`
          : `Koneksi ke WAHA terputus saat mengirim (${code ?? name ?? 'error'}); hasil tidak diketahui.`,
    };
  }

  if (res.ok) {
    const data = await res.json().catch(() => null);
    return { kind: 'SENT', messageId: extractMessageId(data) };
  }
  const detail = await res.text().catch(() => '');
  const msg = `WAHA menjawab HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`;
  // 504 dari reverse proxy: WAHA mungkin tetap memproses -> tidak pasti.
  return res.status === 504 ? { kind: 'UNKNOWN', error: msg } : { kind: 'FAILED', error: msg };
}

export type SessionState =
  | { reachable: true; status: string; needsQr: boolean; account?: { id: string; name: string | null } }
  | { reachable: false; error: string; code?: string };

/**
 * Gambar QR login WhatsApp (PNG) dari WAHA, untuk discan dari dashboard dapur.
 * null = sesi tidak sedang menunggu scan (sudah login / belum start).
 */
export async function fetchLoginQr(cfg: WahaConfig): Promise<Buffer | null> {
  const res = await fetch(`${cfg.baseUrl}/api/${encodeURIComponent(cfg.session)}/auth/qr`, {
    headers: { ...headers(cfg), Accept: 'image/png' },
    signal: AbortSignal.timeout(Math.min(cfg.timeoutMs, 10_000)),
  });
  if (!res.ok) return null;
  if (!(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
  return Buffer.from(await res.arrayBuffer());
}

export type SessionAction = 'start' | 'restart' | 'logout';

/**
 * Kendalikan sesi WAHA dari dashboard: start (membuat sesi bila belum ada), restart (QR macet /
 * FAILED), logout (ganti nomor WA). Melempar Error berpesan bila WAHA menolak.
 */
export async function controlSession(cfg: WahaConfig, action: SessionAction): Promise<void> {
  const name = encodeURIComponent(cfg.session);
  const post = (path: string, body?: unknown) =>
    fetch(`${cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: headers(cfg),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(Math.min(cfg.timeoutMs, 15_000)),
    });
  let res = await post(`/api/sessions/${name}/${action}`);
  if (res.status === 404 && action !== 'logout') {
    // Sesi belum pernah dibuat di WAHA: buat sekaligus jalankan.
    res = await post('/api/sessions', { name: cfg.session, start: true });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WAHA menjawab HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
}

/** Status sesi WA (FR-36): SCAN_QR_CODE / FAILED berarti perlu scan QR ulang di dashboard WAHA. */
export async function getSessionState(cfg: WahaConfig): Promise<SessionState> {
  try {
    const res = await fetch(`${cfg.baseUrl}/api/sessions/${encodeURIComponent(cfg.session)}`, {
      headers: headers(cfg),
      signal: AbortSignal.timeout(Math.min(cfg.timeoutMs, 5000)),
    });
    if (!res.ok) return { reachable: false, error: `WAHA menjawab HTTP ${res.status}` };
    const data = (await res.json()) as { status?: string; me?: { id?: string; pushName?: string } | null };
    const status = String(data.status ?? 'UNKNOWN');
    const state: Extract<SessionState, { reachable: true }> = { reachable: true, status, needsQr: status === 'SCAN_QR_CODE' || status === 'FAILED' };
    // Akun WA yang sedang login (hanya untuk dashboard admin): nomor + nama profil.
    if (data.me?.id) state.account = { id: String(data.me.id).replace(/@.*$/, ''), name: data.me.pushName ?? null };
    return state;
  } catch (err) {
    return { reachable: false, error: (err as Error).message ?? 'WAHA tidak dapat dihubungi', code: errorCode(err) };
  }
}

/**
 * Periksa riwayat pesan keluar ke satu chat apakah pesan berisi `needle` (nomor order) sudah ada.
 * Melempar bila riwayat tidak bisa dibaca (hasil tidak boleh dianggap "tidak ada").
 */
export async function wasMessageSent(
  cfg: WahaConfig,
  phone: string,
  needle: string,
  sinceMs: number
): Promise<boolean> {
  const chatId = encodeURIComponent(toChatId(phone));
  const url =
    `${cfg.baseUrl}/api/${encodeURIComponent(cfg.session)}/chats/${chatId}/messages` +
    `?limit=30&downloadMedia=false&filter.fromMe=true`;
  const res = await fetch(url, { headers: headers(cfg), signal: AbortSignal.timeout(cfg.timeoutMs) });
  if (!res.ok) throw new Error(`Riwayat WAHA HTTP ${res.status}`);
  const msgs = (await res.json()) as { body?: string; timestamp?: number; fromMe?: boolean }[];
  if (!Array.isArray(msgs)) throw new Error('Format riwayat WAHA tidak dikenali');
  return msgs.some(
    (m) =>
      m.fromMe !== false &&
      typeof m.body === 'string' &&
      m.body.includes(needle) &&
      (typeof m.timestamp !== 'number' || m.timestamp * 1000 >= sinceMs)
  );
}
