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
  MIDTRANS_IS_PRODUCTION: "true"
  MIDTRANS_EXPIRY_MINUTES: "15"             # TBD-02, sesuaikan
  WAHA_BASE_URL: http://waha:3000           # alamat WAHA dari sisi container
  WAHA_SESSION: default
  WAHA_API_KEY: <api key WAHA>
  TZ: Asia/Jakarta
  # JANGAN set ALLOW_PAYMENT_SIMULATION
```

Tanpa `ADMIN_PASSWORD` + `SESSION_SECRET` (≥ 32 karakter) seluruh area admin ditolak di production (fail closed).

**Midtrans Dashboard:** daftarkan *Payment Notification URL* =
`https://<domain>/api/payments/midtrans/notification` (Settings → Payment → Notification URL). Midtrans menganggap respons
2xx berhasil; 5xx dicoba ulang, jadi kesalahan sementara di server tidak membuat notifikasi hilang.

**WAHA:** satu sesi pengirim, engine WEBJS, dengan **volume tetap** untuk sesi supaya login WhatsApp bertahan setelah restart
container. Dashboard WAHA tidak boleh dapat diakses publik. Pada pemakaian pertama scan QR dari dashboard WAHA.

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
| **WAHA mati / sesi WA terputus** | Order & pembayaran tetap tersimpan. Notifikasi di-retry 30 dtk → 2 mnt → 5 mnt, lalu `FAILED`. Header admin menampilkan "WAHA tidak terjangkau" / "Perlu scan QR ulang". | Pantau dashboard sebagai jalur cadangan. Perbaiki WAHA/scan QR; lalu *Kirim Ulang* order yang `FAILED`. **Bila tidak ada yang bisa memantau dashboard, tutup pemesanan online secara manual.** Tombol "WA terputus" di Pengaturan menjeda pengiriman (tugas tetap antre, percobaan tidak terpakai). |
| **Notifikasi `UNKNOWN`** (timeout, hasil tak jelas) | Tidak di-retry buta. Setelah jeda, riwayat chat WAHA diperiksa untuk nomor order: ada → `SENT`; tidak ada → dikirim ulang. | Jika verifikasi otomatis gagal 3x, status tetap `UNKNOWN`: cek WhatsApp penerima, baru *Kirim Ulang* bila belum ada. Duplikasi tidak dijamin nol (tidak ada exactly-once); nomor order di pesan membantu mengenali pesan ganda. |
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
| TBD-03 | Hosting web/database | `DATABASE_URL`, jaringan runner migrasi (`--network host`). |
| TBD-05 | Akun admin bersama vs per penjaga | Saat ini satu `ADMIN_PASSWORD` bersama; per penjaga butuh perubahan di `src/server/session.ts` + login. |
| TBD-06 | Kebijakan refund/no-show | SOP bagian 2; belum ada batas/tenggat otomatis. |
| TBD-07 | Aturan pembayaran terlambat, interval jam ambil | Penanda "Perlu konfirmasi waktu" sudah ada; aturan lain belum. |
| TBD-08 | Retensi, masa berlaku tautan, backup | Bagian 6 dan 7 (semua default usulan). |
| TBD-10 | SOP serah terima & penutupan online saat WA mati | Bagian 3 (usulan). |

## 9. Checklist kesiapan produksi (PRD 14.5)

| Item | Status |
|---|---|
| Alur end-to-end di sandbox | Diuji dengan Midtrans/WAHA **palsu** di Postgres asli (webhook, retry, restart, timeout). **Belum** dengan Midtrans sandbox dan WAHA sungguhan. |
| Transaksi produksi nominal kecil | Belum. |
| Diuji di dua ukuran layar HP dan koneksi representatif | Belum (manual). |
| API key/token rahasia tidak muncul di bundle browser | **Terverifikasi** (2026-11-08): build dengan nilai khas untuk `DATABASE_URL`, `MIDTRANS_SERVER_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `WAHA_API_KEY` → 0 berkas di `.next/static` dan `.next/server`; hanya client key publik (`NEXT_PUBLIC_*`) yang ada di bundle klien. Ulangi bila menambah variabel baru. |
| Gangguan WAHA, internet, webhook terlambat diuji | Diuji otomatis dan e2e dengan simulasi; belum dengan gangguan nyata. |
| Backup dan satu percobaan restore | Skrip siap dan teruji lokal; **jalankan pada database produksi** sebelum rilis. |
| Simulasi pergantian sif dan order bermasalah bersama Aa Iis | Belum (manual). |
| Keputusan terbuka yang menghambat produksi ditutup | Lihat bagian 8. |

**Hal yang perlu diuji dengan layanan sungguhan sebelum rilis:** (1) pembayaran sandbox end-to-end termasuk webhook
terdaftar di dashboard; (2) bentuk respons `sendText` dan riwayat chat pada WAHA engine WEBJS (id pesan dibaca defensif; verifikasi
`UNKNOWN` bergantung pada endpoint riwayat — bila tidak terbaca, sistem aman: status tetap `UNKNOWN` dan penjaga memutuskan);
(3) host produksi Midtrans (`app.midtrans.com`, `api.midtrans.com`) dapat di-override lewat `MIDTRANS_SNAP_API_URL` dan
`MIDTRANS_CORE_API_URL` bila berbeda.
