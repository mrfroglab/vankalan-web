#!/usr/bin/env node
/**
 * Preflight sebelum tes end-to-end / go-live: periksa konfigurasi Midtrans, WAHA, dan admin
 * memakai environment yang SAMA dengan aplikasi. Tidak membuat transaksi; tidak menampilkan secret.
 *
 *   node --env-file=.env scripts/check-integrations.mjs [--send-test 62812xxxx]
 *
 * Di server produksi (WAHA hanya terjangkau dari jaringan internal):
 *   docker run --rm --network vankalan-internal --env-file /opt/stacks/apps/vankalan/.env \
 *     -v "$PWD/scripts:/s:ro" node:22-alpine node /s/check-integrations.mjs
 *
 * Keluar dengan kode 1 bila ada pemeriksaan GAGAL (PERINGATAN tidak menggagalkan).
 */
const env = process.env;
const v = (k) => (env[k] ?? '').trim().replace(/^"(.*)"$/, '$1');
let failed = 0;
const ok = (m) => console.log(`  OK    ${m}`);
const warn = (m) => console.log(`  WARN  ${m}`);
const fail = (m) => {
  failed++;
  console.log(`  GAGAL ${m}`);
};
const timeout = (ms) => AbortSignal.timeout(ms);
const sendTo = (() => {
  const i = process.argv.indexOf('--send-test');
  return i > -1 ? process.argv[i + 1] : null;
})();

async function checkApp() {
  console.log('\n[Aplikasi]');
  const prod = v('NODE_ENV') === 'production';
  const appUrl = v('NEXT_PUBLIC_APP_URL');
  if (!appUrl) warn('NEXT_PUBLIC_APP_URL kosong (diisi saat build lewat GitHub Variables).');
  else if (!appUrl.startsWith('https://')) warn(`NEXT_PUBLIC_APP_URL bukan https (${appUrl}); webhook Midtrans butuh URL publik https.`);
  else ok(`URL publik ${appUrl}`);
  if (v('ADMIN_PASSWORD').length < 8) (prod ? fail : warn)('ADMIN_PASSWORD kosong/terlalu pendek (min 8); admin ditolak di production.');
  else ok('ADMIN_PASSWORD terisi');
  if (v('SESSION_SECRET').length < 32) (prod ? fail : warn)('SESSION_SECRET < 32 karakter (openssl rand -base64 48).');
  else ok('SESSION_SECRET terisi (>= 32 karakter)');
  if (v('ALLOW_PAYMENT_SIMULATION') === 'true') (prod ? fail : warn)('ALLOW_PAYMENT_SIMULATION=true: PAID bisa ditandai tanpa webhook. Matikan di production.');
  if (v('DATABASE_URL').includes('schema=')) warn('DATABASE_URL memakai ?schema= (gaya Prisma); aplikasi membuangnya otomatis.');
}

async function checkMidtrans() {
  console.log('\n[Midtrans]');
  const serverKey = v('MIDTRANS_SERVER_KEY');
  const clientKey = v('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY');
  const isProd = v('MIDTRANS_IS_PRODUCTION') === 'true';
  if (!serverKey || serverKey === 'your-midtrans-server-key') {
    fail('MIDTRANS_SERVER_KEY kosong: order dibuat tanpa pembayaran (mode simulasi).');
    return;
  }
  console.log(`  mode  ${isProd ? 'PRODUCTION' : 'SANDBOX'}`);
  // Kunci sandbox lama berawalan "SB-"; dipakai hanya sebagai peringatan karena format bisa berubah.
  if (serverKey.startsWith('SB-') && isProd) warn('Server key tampak kunci SANDBOX, tetapi MIDTRANS_IS_PRODUCTION=true.');
  if (!serverKey.startsWith('SB-') && !isProd && serverKey.startsWith('Mid-')) warn('Server key tampak kunci PRODUCTION, tetapi mode sandbox.');
  if (!clientKey) warn('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak ada di env ini (ditanam saat build lewat GitHub Variables).');
  else if (clientKey.startsWith('SB-') !== serverKey.startsWith('SB-')) warn('Client key dan server key tampak dari environment berbeda (sandbox vs production).');
  const snapJs = v('NEXT_PUBLIC_MIDTRANS_SNAP_URL');
  if (snapJs && snapJs.includes('sandbox') === isProd) warn(`NEXT_PUBLIC_MIDTRANS_SNAP_URL (${snapJs}) tidak cocok dengan mode ${isProd ? 'production' : 'sandbox'}.`);

  // Status API untuk order yang pasti tidak ada: 404 = kunci diterima, 401 = kunci salah.
  const core = v('MIDTRANS_CORE_API_URL') || (isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com');
  try {
    const res = await fetch(`${core}/v2/preflight-${Date.now()}/status`, {
      headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}` },
      signal: timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    const code = String(body.status_code ?? res.status);
    if (code === '404') ok(`Server key diterima Midtrans (${core})`);
    else if (code === '401') fail('Server key DITOLAK Midtrans (401). Cek key dan mode sandbox/production.');
    else warn(`Respons tak terduga dari Status API: HTTP ${res.status}, status_code ${code}`);
  } catch (e) {
    fail(`Midtrans tidak terjangkau (${core}): ${e.message}`);
  }
  if (v('NEXT_PUBLIC_APP_URL')) {
    console.log(`  info  Notification URL yang harus terdaftar di dashboard Midtrans (${isProd ? 'Production' : 'Sandbox'}):`);
    console.log(`        ${v('NEXT_PUBLIC_APP_URL').replace(/\/+$/, '')}/api/payments/midtrans/notification`);
  }
}

async function checkWaha() {
  console.log('\n[WAHA]');
  const base = v('WAHA_BASE_URL').replace(/\/+$/, '');
  const session = v('WAHA_SESSION') || 'default';
  const key = v('WAHA_API_KEY');
  if (!base) {
    fail('WAHA_BASE_URL kosong: notifikasi WA langsung FAILED.');
    return;
  }
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', ...(key ? { 'X-Api-Key': key } : {}) };
  try {
    const res = await fetch(`${base}/api/sessions/${encodeURIComponent(session)}`, { headers, signal: timeout(5_000) });
    if (res.status === 401) return fail('WAHA menolak API key (401): WAHA_API_KEY di .env harus sama dengan di waha.env.');
    if (res.status === 404) return fail(`Sesi "${session}" belum dibuat di WAHA (buka dashboard, Start session).`);
    if (!res.ok) return fail(`WAHA menjawab HTTP ${res.status}`);
    const s = await res.json();
    if (s.status === 'WORKING') ok(`Sesi "${session}" WORKING sebagai ${s.me?.id ?? '?'}${s.me?.pushName ? ` (${s.me.pushName})` : ''}`);
    else if (s.status === 'SCAN_QR_CODE') return fail(`Sesi "${session}" menunggu scan QR (dashboard WAHA).`);
    else return fail(`Sesi "${session}" berstatus ${s.status}; harus WORKING.`);
  } catch (e) {
    return fail(`WAHA tidak terjangkau di ${base}: ${e.message}`);
  }
  if (sendTo) {
    const chatId = `${sendTo.replace(/\D/g, '').replace(/^0/, '62')}@c.us`;
    const res = await fetch(`${base}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session, chatId, text: `Tes notifikasi Warmindo Putra Vangkalan (${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}). Abaikan pesan ini.` }),
      signal: timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) ok(`Pesan tes terkirim ke ${chatId} (id ${typeof body.id === 'string' ? body.id : body.id?._serialized ?? '?'})`);
    else fail(`Kirim tes gagal: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
}

await checkApp();
await checkMidtrans();
await checkWaha();
console.log(failed ? `\n${failed} pemeriksaan GAGAL.` : '\nSemua pemeriksaan wajib lolos.');
process.exit(failed ? 1 : 0);
