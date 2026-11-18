# Panduan Operasional

Untuk pemilik dan pengelola sistem Warmindo Putra Vangkalan. Bagian bertanda **(usulan)** adalah rekomendasi yang belum
dikonfirmasi pemilik warung (lihat PRD bagian 17); jangan dianggap keputusan bisnis.

## 1. Checklist go-live

**Secrets & variabel di GitHub** (*Settings → Secrets and variables → Actions*)

| Jenis | Nama | Isi |
|---|---|---|
| Secret | `DATABASE_URL` | Koneksi PostgreSQL produksi. Bila kosong, langkah migrasi di deploy dilewati dengan peringatan. |
| Variable | `NEXT_PUBLIC_API_URL` | `/` (backend satu origin). Kosong = aplikasi hanya jalan di mode prototipe localStorage. |
| Variable | `NEXT_PUBLIC_APP_URL` | URL publik, mis. `https://pesan.domain-anda.id` |
| Variable | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_SNAP_URL` | Client key Midtrans (publik) dan URL `snap.js` (sandbox/production). |

Variabel *Variable* di atas ditanam ke bundle **saat build**; mengubahnya berarti build ulang (push ke `main`).

**Environment container di server** (`/opt/stacks/apps/vankalan/docker-compose.yml`, di luar repo)

```yaml
environment:
  DATABASE_URL: postgresql://...            # sama dengan secret di atas
  ADMIN_PASSWORD: <kata sandi bersama penjaga>
  SESSION_SECRET: <openssl rand -base64 48>
  MIDTRANS_SERVER_KEY: <server key production>
  MIDTRANS_SIGNATURE_KEY: <Signature Secret Key>  # akun baru; lihat catatan di bawah
  MIDTRANS_IS_PRODUCTION: "true"
  MIDTRANS_EXPIRY_MINUTES: "15"             # TBD-02, sesuaikan
  WAHA_BASE_URL: http://waha:3000           # alamat WAHA dari sisi container
  WAHA_SESSION: default
  WAHA_API_KEY: <api key WAHA>
  TZ: Asia/Jakarta
  # JANGAN set ALLOW_PAYMENT_SIMULATION
```

Tanpa `ADMIN_PASSWORD` + `SESSION_SECRET` (≥ 32 karakter) seluruh area admin ditolak di production (fail closed).

**Kunci Midtrans (akun baru, dashboard 2026):** di *Settings → Access Keys → General Credentials* ada tiga hal:
(1) **Server Keys**: buat dengan *Generate server key*, izin minimal **Snap Checkout = Write** dan **Core API = Read**
(lainnya None). Key hanya tampil **sekali** → `MIDTRANS_SERVER_KEY`. (2) **Signature Secret Key** → `MIDTRANS_SIGNATURE_KEY`;
Midtrans menandatangani notifikasi dan respons status dengan key ini, **bukan** dengan server key ber-scope (diuji
2026-11-18 di sandbox). Tanpa ini semua webhook ditolak 403. (3) **Client Key** → GitHub Variable
`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`. Kunci sandbox akun baru bisa tidak berawalan `SB-`. Lakukan untuk Sandbox dan
Production secara terpisah (pilih *Environment* di kiri atas).

**Midtrans Dashboard:** daftarkan *Payment Notification URL* =
`https://<domain>/api/payments/midtrans/notification` (Settings → Payment → Notification URL). Midtrans menganggap respons
2xx berhasil; 5xx dicoba ulang, jadi kesalahan sementara di server tidak membuat notifikasi hilang.

**WAHA:** satu sesi pengirim, engine WEBJS, dengan **volume tetap** untuk sesi supaya login WhatsApp bertahan setelah restart
container. Dashboard WAHA tidak boleh dapat diakses publik. Pada pemakaian pertama scan QR dari dashboard WAHA.
Di server sudah terpasang sebagai service `waha` (container `vankalan-waha`) di stack vankalan: hanya di jaringan
`vankalan-internal` bersama `app`, dashboard di `http://127.0.0.1:3008/dashboard` (localhost server saja), kredensial
dashboard dan API key di `/opt/stacks/apps/vankalan/waha.env` (`chmod 600`; `WAHA_API_KEY` di `.env` harus sama),
sesi tersimpan di `data/waha-sessions`. Pakai **nomor WhatsApp khusus warung** sebagai pengirim, bukan nomor pribadi.
Dari laptop lain: `ssh -L 3008:127.0.0.1:3008 <server>` lalu buka `http://localhost:3008/dashboard`.

**Preflight** (key Midtrans diterima? sesi WA aktif? secret admin terisi?) sebelum tes atau rilis:

```bash
docker run --rm --network vankalan-internal --env-file /opt/stacks/apps/vankalan/.env \
  -v "$PWD/scripts:/s:ro" node:22-alpine node /s/check-integrations.mjs [--send-test 0812xxxx]
```

**Database:** buat database kosong, lalu `pnpm db:migrate` (otomatis lewat deploy bila `DATABASE_URL` secret ada).
`pnpm db:seed` **hanya** untuk database kosong: ia menimpa menu, kategori, sif, dan pengaturan dengan data contoh. Setelah itu
kelola menu dan penjaga lewat dashboard admin.

**Sebelum membuka ke pelanggan:** lihat checklist kesiapan di bagian 9.

## 2. Alur sehari-hari penjaga

1. Masuk di `/admin` (kata sandi bersama). Sesi berlaku 12 jam.
2. Pilih sif aktif di *Penjaga & Sif*. Pesanan baru dan notifikasi WA berikutnya dikirim ke sif aktif.
3. Pantau *Antrean Dapur*. Order baru muncul setelah lunas; ubah status Diterima → Dimasak → Siap → Selesai.
   Pelanggan dihubungi manual lewat WhatsApp saat makanan siap (sistem tidak mengirim notifikasi "siap").
4. Badge **WA Gagal / WA Belum Pasti** berarti notifikasi ke penjaga belum terkonfirmasi: buka detail order dan
   gunakan *Kirim Ulang*. Order tetap tampil di dashboard walau WA bermasalah.
5. Badge **Perlu konfirmasi waktu**: pembayaran masuk terlambat dan jam ambil terjadwal mungkin tak terkejar; hubungi pelanggan.
6. Tombol **Toko Online BUKA/TUTUP** mengatur penerimaan pesanan online (ditegakkan juga di server), bukan status fisik warung.

### Serah terima sif

Mengaktifkan sif baru **tidak** mengirim apa pun otomatis. Bila ada pesanan lunas yang belum selesai, muncul konfirmasi
*Kirim Sekarang / Nanti*. Panel *Serah Terima Sif* menandai pesanan yang belum diberi tahu ke sif aktif dan menyediakan
tombol kirim massal. Pesan ditandai **[KIRIM ULANG]** supaya tidak dikira pesanan baru; pembayaran dan status pesanan tidak berubah.
Retry otomatis untuk pesan yang gagal tetap menuju penerima awal; pindah ke penjaga pengganti hanya lewat kirim ulang yang eksplisit.

### Refund dan pembatalan (manual)

- Batalkan order dari detail antrean (alasan wajib). Bila order sudah lunas, otomatis dibuat catatan refund **PENDING** sebesar total.
- Transfer refund dilakukan manual di luar sistem, lalu catat di dialog refund (status sebagian/penuh + nominal). Nominal tidak
  boleh melebihi total. Refund tercatat terpisah dari status pembayaran.
- Sistem juga membuat refund PENDING otomatis bila: **pembayaran ganda** (dua percobaan sama-sama lunas), atau **pembayaran
  masuk setelah pesanan dibatalkan**.
- Kebijakan batas/tenggat refund dan biaya transfer: TBD-06 (belum diputuskan).

## 3. SOP gangguan (usulan; TBD-10)

| Gangguan | Yang terjadi otomatis | Tindakan penjaga/pengelola |
|---|---|---|
| **WAHA mati / sesi WA terputus** | Order & pembayaran tetap tersimpan. Sebelum kirim, status sesi dicek: bila tidak `WORKING` (mis. `SCAN_QR_CODE`), pengiriman langsung dianggap gagal-pasti tanpa memanggil `sendText` (diuji dengan WAHA asli, 2026-11-14). Notifikasi di-retry 30 dtk → 2 mnt → 5 mnt, lalu `FAILED`. Header admin menampilkan "WAHA tidak terjangkau" / "Perlu scan QR ulang". | Pantau dashboard sebagai jalur cadangan. Perbaiki WAHA/scan QR; lalu *Kirim Ulang* order yang `FAILED`. **Bila tidak ada yang bisa memantau dashboard, tutup pemesanan online secara manual.** Tombol "WA terputus" di Pengaturan menjeda pengiriman (tugas tetap antre, percobaan tidak terpakai). |
| **Notifikasi `UNKNOWN`** (timeout, hasil tak jelas) | Tidak di-retry buta. Setelah jeda, riwayat chat WAHA diperiksa untuk nomor order: ada → `SENT`; tidak ada → dikirim ulang. Selama sesi WA tidak aktif, verifikasi ditunda tanpa menghabiskan jatah 3x. | Jika verifikasi otomatis gagal 3x, status tetap `UNKNOWN`: cek WhatsApp penerima, baru *Kirim Ulang* bila belum ada. Duplikasi tidak dijamin nol (tidak ada exactly-once); nomor order di pesan membantu mengenali pesan ganda. |
| **Webhook Midtrans terlambat/hilang** | Rekonsiliasi: saat pelanggan membuka halaman order (maks 1x/30 dtk), tiap 2 menit oleh pekerja, dan lewat `POST /api/payments/reconcile`. | Tidak perlu tindakan. Jangan minta pelanggan bayar lagi; sistem mengecek status resmi sebelum membuat percobaan bayar baru. |
| **Midtrans tidak terjangkau saat checkout** | Order `FAILED`, pelanggan melihat pesan gagal memulai pembayaran. | Minta pelanggan mencoba lagi. Tidak ada order palsu di sisi dapur. |
| **Pelanggan membayar tapi menutup halaman** | Webhook tetap memproses; order muncul di dapur. | Pelanggan membuka tautan/riwayat order di perangkatnya. |
| **Pembayaran ganda** | Refund PENDING otomatis. | Transfer balik manual, lalu catat refund. |
| **Bahan habis setelah lunas** | — | Hubungi pelanggan, batalkan order (refund PENDING otomatis), transfer manual. |
| **Database tidak tersedia** | Halaman dan API gagal; webhook dijawab 5xx sehingga Midtrans mencoba ulang. | Pulihkan database; lihat bagian 6 untuk restore. |
| **Server restart saat ada tugas WA** | Tugas tersimpan di database; dilanjutkan setelah start. Tugas yang sedang mengirim saat mati ditandai `UNKNOWN` lalu diverifikasi. | Tidak perlu tindakan. |

## 4. Referensi API

**Publik**

| Endpoint | Fungsi |
|---|---|
| `GET /api/menu`, `/api/categories`, `/api/settings` | Katalog dan pengaturan toko. |
| `POST /api/orders` | Buat order (harga dihitung ulang server) dan mulai pembayaran Midtrans. |
| `GET /api/orders/token/:token` | Lacak order dengan tautan privat (404 salah token, 410 kedaluwarsa). |
| `POST /api/orders/token/:token/pay` | Mulai/lanjutkan/ulangi pembayaran (maks 5 percobaan). |
| `POST /api/payments/midtrans/notification` | Webhook Midtrans (diverifikasi signature). |
| `POST /api/auth/login`, `/logout`, `GET /api/auth/session` | Sesi admin. |

**Admin** (cookie sesi; mutasi lintas-origin ditolak)

| Endpoint | Fungsi |
|---|---|
| `PUT /api/menu`, `/api/categories`, `/api/shifts`; `PATCH /api/settings`; `GET /api/shifts` | Kelola menu, sif, pengaturan. |
| `GET /api/orders`, `GET /api/orders/:id` | Daftar/detail order. |
| `PATCH /api/orders/:id/status`; `POST /api/orders/:id/cancel`, `/refund`, `/retry-wa` | Proses, batalkan, refund, kirim ulang WA. |
| `POST /api/payments/reconcile` | Rekonsiliasi pembayaran PENDING sekarang. |
| `GET /api/wa/status` | Kondisi sesi WhatsApp di WAHA. |
| `POST /api/maintenance/purge` | Jalankan kebijakan retensi sekarang. |

**Hanya non-production:** `PATCH /api/orders/:id/payment` (simulasi, butuh `ALLOW_PAYMENT_SIMULATION=true`),
`POST /api/orders/seed`, `POST /api/reset`.

## 5. Pemantauan

- **Log container:** `[worker] Antrean WA & rekonsiliasi pembayaran aktif ...` saat start; `[worker] Retensi data: {...}`
  bila ada data dibersihkan; `[midtrans]`/`[payments]`/`[wa-queue]` untuk error integrasi.
- **Dashboard admin:** badge WA Gagal/Belum Pasti, tab *WA Gagal*, pill status sesi WA di header.
- **Audit pembayaran:** tabel `payment_events` mencatat setiap notifikasi/cek status beserta hasilnya
  (`applied`, `noop`, `amount_mismatch`, `unknown_order`, `duplicate_payment`, `late_after_cancel`, `ignored`).
  `amount_mismatch` patut diselidiki: nominal dari Midtrans tidak sama dengan tagihan.
- **Tugas WA:** tabel `notification_jobs` (penerima, percobaan, error terakhir, id pesan).

## 6. Backup dan restore

```bash
# Cadangan (format custom pg_dump). Memakai pg_dump host bila ada, jika tidak lewat Docker.
DATABASE_URL=postgresql://... pnpm db:backup backups          # KEEP=14 cadangan terbaru disimpan

# Uji pemulihan: pulihkan ke database sementara, cek semua tabel, bandingkan jumlah baris, lalu hapus.
DATABASE_URL=postgresql://... pnpm db:restore-check backups/warmindo-YYYYMMDD-HHMMSS.dump
```

**Di server produksi** DB hanya ada di jaringan Docker (`vankalan-db` di `gateway-net`, tanpa port ke host), jadi alat
PostgreSQL dijalankan lewat container di jaringan itu. `DATABASE_URL` bergaya Prisma (`?schema=public`) dirapikan otomatis:

```bash
cd vankalan-web
set -a; . /opt/stacks/apps/vankalan/.env; set +a
PG_NETWORK=gateway-net pnpm db:backup /opt/stacks/backup/vankalan
PG_NETWORK=gateway-net pnpm db:restore-check /opt/stacks/backup/vankalan/warmindo-YYYYMMDD-HHMMSS.dump
# Sebelum cutover (DB masih berisi tabel backend Express lama): tambahkan REQUIRE_APP_TABLES=0
```

Cadangan pertama + uji restore DB produksi: **berhasil** 2026-11-14 (`/opt/stacks/backup/vankalan/`, skema lama).

**(usulan)** Jadwalkan `db:backup` harian lewat cron di server (mis. 02:00) dan salin hasilnya ke lokasi di **luar** server
database. Pengguna di `DATABASE_URL` harus boleh `CREATE DATABASE` untuk `db:restore-check`; selisih jumlah baris hanya
peringatan (data hidup berubah setelah cadangan). Lokasi, retensi cadangan, dan jadwal final: TBD-08.

Pemulihan sungguhan: buat database kosong, lalu
`pg_restore --no-owner -d <DATABASE_URL> backups/<berkas>.dump` (atau lewat container `postgres`, input dari stdin).
PRD 14.5 mewajibkan **satu percobaan restore selesai sebelum produksi**: jalankan `db:restore-check` pada cadangan nyata.

## 7. Retensi data

**(usulan; TBD-08)** — semua dapat diubah lewat env, dan berjalan otomatis tiap 6 jam (idempoten) atau manual via
`POST /api/maintenance/purge`.

| Aturan | Default | Env |
|---|---|---|
| Tautan privat order kedaluwarsa setelah N hari sejak dibuat (pesanan lunas yang masih berjalan tidak pernah putus) | 30 | `ORDER_LINK_TTL_DAYS` |
| Nama, nomor WA, dan catatan pelanggan dianonimkan untuk pesanan selesai/batal; total dan item tetap untuk pembukuan. Pesanan dengan refund belum tuntas tidak disentuh | 90 | `PII_RETENTION_DAYS` |
| Pesanan yang tidak pernah lunas dihapus (kecuali ada catatan refund) | 7 | `UNPAID_RETENTION_DAYS` |
| Payload mentah log event pembayaran dikosongkan (baris audit tetap) | 180 | `EVENT_RETENTION_DAYS` |

Penghapusan/anonimisasi **tidak dapat dibatalkan** selain dengan memulihkan cadangan. Riwayat di perangkat pelanggan
(localStorage) tidak dihapus server.

## 8. Keputusan terbuka yang berdampak ke konfigurasi

| ID | Keputusan | Memengaruhi |
|---|---|---|
| TBD-01 | Daftar menu, harga, foto final | Isi katalog produksi lewat dashboard (jangan `db:seed` ulang). |
| TBD-02 | Akun Midtrans, kanal, durasi kedaluwarsa | `MIDTRANS_*`, `MIDTRANS_EXPIRY_MINUTES` (default 15). |
| ~~TBD-03~~ | Hosting web/database | **Terjawab:** Thinkpad (`/opt/stacks/apps/vankalan`), DB `vankalan-db` di `gateway-net`. Migrasi deploy: GitHub Variable `MIGRATION_NETWORK=gateway-net`. |
| TBD-05 | Akun admin bersama vs per penjaga | Saat ini satu `ADMIN_PASSWORD` bersama; per penjaga butuh perubahan di `src/server/session.ts` + login. |
| TBD-06 | Kebijakan refund/no-show | SOP bagian 2; belum ada batas/tenggat otomatis. |
| TBD-07 | Aturan pembayaran terlambat, interval jam ambil | Penanda "Perlu konfirmasi waktu" sudah ada; aturan lain belum. |
| TBD-08 | Retensi, masa berlaku tautan, backup | Bagian 6 dan 7 (semua default usulan). |
| TBD-10 | SOP serah terima & penutupan online saat WA mati | Bagian 3 (usulan). |

Lembar keputusan untuk pemilik warung (bahasa sederhana, dengan rekomendasi): [`KEPUTUSAN-PEMILIK.md`](./KEPUTUSAN-PEMILIK.md).

## 9. Checklist kesiapan produksi (PRD 14.5)

| Item | Status |
|---|---|
| Alur end-to-end di sandbox | **Sebagian** (2026-11-14). WAHA asli (v2026.10.1, WEBJS) terpasang di server; endpoint dicocokkan dengan OpenAPI-nya; alur order → PAID → antrean WA diuji ke WAHA asli (sesi belum login dan container mati). **Sisa:** scan QR lalu tes kirim sungguhan, dan Midtrans sandbox (butuh key). Jalankan `scripts/check-integrations.mjs` dulu. |
| Transaksi produksi nominal kecil | Belum (butuh akun Midtrans produksi + cutover, bagian 10). |
| Diuji di dua ukuran layar HP dan koneksi representatif | **Otomatis lulus** (2026-11-14): Chrome mobile 360×740 dan 412×915, jaringan 4G dan 3G lambat + CPU 4x; menu → tambah → checkout → order → admin antrean, tanpa scroll horizontal. Menu siap dipakai ±1 dtk (4G) / ±3,8 dtk (3G lambat). Ditemukan & diperbaiki: header melebarkan halaman di layar 360px. **Sisa:** coba sekali di HP sungguhan. |
| API key/token rahasia tidak muncul di bundle browser | **Terverifikasi** (2026-11-08): build dengan nilai khas untuk `DATABASE_URL`, `MIDTRANS_SERVER_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `WAHA_API_KEY` → 0 berkas di `.next/static` dan `.next/server`; hanya client key publik (`NEXT_PUBLIC_*`) yang ada di bundle klien. Ulangi bila menambah variabel baru. |
| Gangguan WAHA, internet, webhook terlambat diuji | **WAHA: diuji nyata** (sesi belum login → gagal-pasti + retry; container dimatikan → `ECONNREFUSED` + retry; restart → sesi aktif lagi). Uji ini menemukan bug: WAHA asli menahan ~10 dtk sebelum menolak sehingga semua order jadi `UNKNOWN`; sudah diperbaiki. Webhook terlambat & internet putus: masih simulasi (butuh Midtrans sandbox). |
| Backup dan satu percobaan restore | **Berhasil pada DB produksi** (2026-11-14, skema lama). Gladi migrasi cutover pada salinan DB produksi juga berhasil. Ulangi `db:restore-check` setelah cutover (skema baru). |
| Simulasi pergantian sif dan order bermasalah bersama Aa Iis | Belum (manual). Naskah: [`SIMULASI-SIF.md`](./SIMULASI-SIF.md). |
| Keputusan terbuka yang menghambat produksi ditutup | Lihat bagian 8. |

**Hal yang perlu diuji dengan layanan sungguhan sebelum rilis:** (1) pembayaran sandbox end-to-end termasuk webhook
terdaftar di dashboard; (2) bentuk respons `sendText` dan riwayat chat pada WAHA engine WEBJS (id pesan dibaca defensif; verifikasi
`UNKNOWN` bergantung pada endpoint riwayat — bila tidak terbaca, sistem aman: status tetap `UNKNOWN` dan penjaga memutuskan);
(3) host produksi Midtrans (`app.midtrans.com`, `api.midtrans.com`) dapat di-override lewat `MIDTRANS_SNAP_API_URL` dan
`MIDTRANS_CORE_API_URL` bila berbeda.

## 10. Cutover produksi (backend Express lama → backend Next.js)

Produksi saat ini masih versi lama: `vankalan-app` (frontend lama) + `vankalan-api` (Express/Prisma), dan Caddy
mengarahkan `/api/*` ke `vankalan-api`. Backend baru ada di route `/api/*` aplikasi Next.js ini (termasuk webhook
Midtrans). Tabel keduanya tidak bentrok (PascalCase vs snake_case), tetapi **data lama tidak dipindahkan**: 8 menu dan
2 order uji di tabel lama; menu final diisi ulang lewat dashboard (TBD-01).

**Merge ke `main` = deploy otomatis.** Siapkan semua ini dulu, baru merge:

1. **GitHub** (`mrfroglab/vankalan-web` → Settings → Secrets and variables → Actions):
   - Secret `DATABASE_URL` = isi `DATABASE_URL` dari `/opt/stacks/apps/vankalan/.env`, tanpa menampilkannya:
     `grep '^DATABASE_URL=' /opt/stacks/apps/vankalan/.env | cut -d= -f2- | tr -d '"' | gh secret set DATABASE_URL -R mrfroglab/vankalan-web`
   - Variables: `MIGRATION_NETWORK=gateway-net`, `NEXT_PUBLIC_API_URL=/`, `NEXT_PUBLIC_APP_URL=https://<domain final>`,
     `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_SNAP_URL` (sandbox: `https://app.sandbox.midtrans.com/snap/snap.js`).
2. **Server** `/opt/stacks/apps/vankalan/.env`: `MIDTRANS_SERVER_KEY` dan `MIDTRANS_SIGNATURE_KEY` sandbox sudah terisi
   (2026-11-18; sudah ada `ADMIN_PASSWORD`, `SESSION_SECRET`,
   `WAHA_*`, `MIDTRANS_IS_PRODUCTION=false`, `MIDTRANS_EXPIRY_MINUTES=15`). Jangan set `ALLOW_PAYMENT_SIMULATION`.
3. **WAHA**: sesi `default` sudah di-scan QR (status `WORKING`). Preflight harus lolos (bagian 1).
4. **Midtrans dashboard**: Notification URL = `https://<domain final>/api/payments/midtrans/notification`.
   Sandbox sudah diisi `https://vankalan.hallojanu.me/...` (2026-11-18); ubah bila domain final berbeda.
5. **Backup** tepat sebelum merge (bagian 6, `REQUIRE_APP_TABLES=0`).
6. **Merge PR** → tunggu workflow *CI/CD Pipeline* hijau (migrasi jalan lewat `gateway-net`, app di-recreate).
7. **Caddy** (setelah app baru jalan), sesuai SOP: backup `Caddyfile`, hapus blok `handle /api/*` → `vankalan-api` pada domain
   vankalan sehingga semua path ke `vankalan-app:3000`, lalu `caddy validate` + `caddy reload`.
8. **Matikan backend lama**: `docker compose -f /opt/stacks/apps/vankalan/docker-compose.yml stop api`
   (hapus service `api` dari compose setelah beberapa hari stabil).
9. **Verifikasi**: buka situs di HP, login `/admin`, isi menu & sif (nomor WA penjaga asli), buat order sandbox sampai
   lunas dan WA masuk ke penjaga, lalu `db:restore-check` (tanpa `REQUIRE_APP_TABLES=0`).

**Rollback:** kembalikan `Caddyfile.bak` + reload, `docker compose start api`, dan deploy ulang image lama
(`ghcr.io/mrfroglab/vankalan-web:sha-<commit lama>` sebagai `latest`). Tabel baru boleh dibiarkan; tidak mengganggu backend lama.

## 11. Galeri kenangan pelanggan

Pelanggan mengirim foto + caption di `/galeri`; admin memoderasi di `/admin/galeri`.

**Aturan yang berlaku**
- **Filter otomatis** (menolak saat kirim, pengirim bisa memperbaiki): kata kasar, istilah judi online, tautan,
  nomor HP, email, plus *kata terlarang tambahan* yang diisi admin. Kata dicocokkan utuh setelah normalisasi
  (`pantai` tidak kena `tai`; `4nj1ng`/`anjiiing` tetap kena).
- **Persetujuan admin**: default semua foto masuk antrean *Menunggu*. Admin bisa merapikan caption sebelum
  *Setujui*. *Tolak*/*Hapus* menghapus foto dan berkasnya permanen. *Sembunyikan* mengembalikan foto tampil ke antrean.
- **Setujui otomatis** (opsional, default mati): foto yang lolos filter langsung tampil, kecuali foto duplikat atau
  pengirim yang sudah ≥3 kali mengirim dalam 24 jam (tetap menunggu admin, diberi tanda).
- **Tutup kiriman**: matikan *Terima kiriman foto*; galeri tetap tampil.
- Batas: JPG/PNG/WebP maks 10 MB, min 200 px; 5 kiriman/jam per IP, 60/jam total; antrean maks 300.
- Privasi: foto di-encode ulang ke WebP (maks 1600 px) dan **metadata EXIF/GPS dibuang**. IP tidak disimpan, hanya
  hash IP + `SESSION_SECRET` untuk mendeteksi spam. Pengirim wajib mencentang persetujuan tampil publik.

**Penyimpanan (wajib di server)**: berkas foto ada di disk, bukan DB. Default `GALLERY_DIR=/app/data/gallery` di
container, harus di-mount sebagai volume agar tidak hilang saat deploy, dan bisa ditulis user container (uid 1001):

```yaml
# /opt/stacks/apps/vankalan/docker-compose.yml, service app
    volumes:
      - ./data/gallery:/app/data/gallery
```
```bash
mkdir -p /opt/stacks/apps/vankalan/data/gallery
docker run --rm -v /opt/stacks/apps/vankalan/data/gallery:/g alpine chown 1001:1001 /g
```

**Backup**: `db:backup` hanya mencakup DB (data foto dan caption). Cadangkan juga berkasnya, mis.
`tar czf /opt/stacks/backup/vankalan/galeri-$(date +%Y%m%d).tgz -C /opt/stacks/apps/vankalan/data gallery`.

**Permintaan hapus** dari orang yang ada di foto: hapus lewat `/admin/galeri` → tab *Tampil* → *Hapus*.
