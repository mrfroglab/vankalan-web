# Warmindo Putra Vangkalan — Pemesanan Online

Web pemesanan **pickup** untuk Warmindo Putra Vangkalan: pelanggan memilih menu, membayar lewat Midtrans, dan menentukan
waktu ambil tanpa membuat akun. Setelah pembayaran terverifikasi, ringkasan pesanan dikirim otomatis lewat WhatsApp
(WAHA) ke penjaga sif aktif, dan pesanan muncul di dashboard dapur.

Spesifikasi produk ada di [`docs/PRD-Warmindo-Putra-Vangkalan-v2.md`](docs/PRD-Warmindo-Putra-Vangkalan-v2.md).
Panduan menjalankan dan mengoperasikan ada di [`docs/OPERASIONAL.md`](docs/OPERASIONAL.md).

> **Next.js 16.** Versi ini punya perubahan API dibanding yang umum dikenal (mis. `proxy.ts` menggantikan `middleware.ts`,
> `RouteContext` untuk `params`). Baca `node_modules/next/dist/docs/` sebelum mengubah kode framework (lihat `AGENTS.md`).

## Fitur

| Area | Status |
|---|---|
| Katalog, keranjang persisten, kustomisasi item, checkout, jam ambil WIB | Selesai |
| Backend: PostgreSQL (Drizzle), validasi harga/estimasi/jam ambil di server | Selesai |
| Login admin (cookie sesi bertanda tangan), semua endpoint admin terlindungi | Selesai |
| Midtrans Snap server-side, webhook terverifikasi, rekonsiliasi, bayar ulang | Selesai |
| Antrean WhatsApp persisten: retry, status `UNKNOWN`, kirim ulang manual | Selesai |
| Dashboard admin: antrean dapur, menu, sif & serah terima, pengaturan | Selesai |
| Retensi data, tautan privat berbatas waktu, skrip backup & uji restore | Selesai |
| Uji dengan Midtrans/WAHA **sungguhan** dan peluncuran terbatas | Belum (lihat `docs/OPERASIONAL.md`) |

## Arsitektur singkat

```
Browser ──► Next.js (App Router)
            ├─ halaman pelanggan & admin (React 19, Tailwind 4)
            └─ /api/*  (route handler) ──► PostgreSQL (Drizzle ORM)
                 │  ▲                         ▲
                 │  └─ webhook Midtrans       │
                 ▼                            │
            Midtrans Snap/Status API     pekerja latar belakang (src/instrumentation.ts)
                                              ├─ antrean WhatsApp ──► WAHA ──► WhatsApp penjaga
                                              ├─ rekonsiliasi pembayaran PENDING (tiap 2 menit)
                                              └─ retensi data (tiap 6 jam)
```

Prinsip yang dijaga kode (PRD bagian 14): harga dan jam ambil dihitung ulang di server; status `PAID` **hanya** dari
webhook/Status API terverifikasi (browser tidak pernah menandai lunas); webhook berulang tidak menggandakan order atau
pesan WA; kegagalan WA tidak pernah menghilangkan order.

**Mode prototipe.** Bila `NEXT_PUBLIC_API_URL` kosong, frontend memakai `localStorage` dan simulasi pembayaran (berguna
untuk demo UI tanpa database). Untuk backend sungguhan isi `NEXT_PUBLIC_API_URL=/` (satu origin).

## Mulai cepat (pengembangan)

Prasyarat: Node.js 22, [pnpm](https://pnpm.io), Docker (untuk PostgreSQL lokal).

```bash
pnpm install
cp .env.example .env            # lalu isi DATABASE_URL dsb. (lihat tabel di bawah)

# PostgreSQL lokal
docker run -d --name warmindo-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=warmindo -p 5432:5432 postgres:16-alpine
# di .env:  DATABASE_URL=postgresql://postgres:pw@localhost:5432/warmindo
#           NEXT_PUBLIC_API_URL=/

pnpm db:migrate                  # terapkan skema
pnpm db:seed                     # data awal (opsional: -- --demo-orders)
pnpm dev                         # http://localhost:3000  (admin: /admin)
```

Tanpa `ADMIN_PASSWORD`/`SESSION_SECRET`, endpoint admin terbuka **hanya di pengembangan**; di production tanpa keduanya
semua akses admin ditolak (fail closed).

> **Peringatan `db:seed`:** perintah ini **menimpa** kategori, menu, sif, dan pengaturan dengan data contoh. Jalankan hanya
> untuk setup awal database kosong, jangan di database yang sudah berisi data nyata.

## Variabel lingkungan

Contoh lengkap dan komentar ada di [`.env.example`](.env.example).

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Koneksi PostgreSQL. |
| `NEXT_PUBLIC_API_URL` | ya (*build*) | `/` = backend satu origin; kosong = mode prototipe. **Di-inline saat build.** |
| `NEXT_PUBLIC_APP_URL` | ya (*build*) | URL publik app (tautan Snap `finish`, tautan admin di pesan WA). **Di-inline saat build.** |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | production | Kata sandi admin bersama; kunci sesi ≥ 32 karakter (`openssl rand -base64 48`). |
| `MIDTRANS_SERVER_KEY` | pembayaran | Kosong = mode simulasi dev. Tambah `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_EXPIRY_MINUTES`. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_SNAP_URL` | pembayaran (*build*) | Dipakai Snap.js di browser. **Di-inline saat build.** |
| `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_API_KEY` | notifikasi WA | Kosong = notifikasi ditandai gagal dan di-retry. |
| `WA_RETRY_DELAYS_SECONDS`, `WAHA_TIMEOUT_MS`, `WA_VERIFY_DELAY_SECONDS`, `WA_WORKER_*` | opsional | Kebijakan retry & pekerja. |
| `ORDER_LINK_TTL_DAYS`, `PII_RETENTION_DAYS`, `UNPAID_RETENTION_DAYS`, `EVENT_RETENTION_DAYS` | opsional | Retensi data (usulan default 30/90/7/180). |
| `ALLOW_PAYMENT_SIMULATION` | dev saja | Mengizinkan menandai PAID tanpa webhook. **Jangan aktifkan di production.** |

Variabel bertanda *build* harus diberikan saat `docker build`/CI (build-arg), karena Next.js menanamkan `NEXT_PUBLIC_*` ke
bundle; mengisinya di environment container saat runtime tidak berpengaruh.

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm dev` / `build` / `start` | Server pengembangan / build produksi / jalankan build. |
| `pnpm test` | Seluruh tes (Vitest; tes backend memakai PostgreSQL in-memory PGlite dengan migrasi nyata). |
| `pnpm lint` | ESLint. |
| `pnpm db:generate` | Buat migrasi SQL dari perubahan `src/server/db/schema.ts` (commit folder `drizzle/`; CI menolak bila lupa). |
| `pnpm db:migrate` / `db:seed` | Terapkan migrasi / isi data awal (membaca `.env` bila ada). |
| `pnpm db:backup` / `db:restore-check` | Cadangkan database / uji pemulihan ke database sementara. |

## Struktur

```
src/app/(customer)/    halaman pelanggan: menu, checkout, order/[token], history
src/app/(admin)/admin/ dashboard: antrean, menu, sif, pengaturan, login
src/app/api/           route handler (lihat tabel API di docs/OPERASIONAL.md)
src/server/            db/ (skema Drizzle), repos/, orders/ (harga & jam ambil), payments/ (Midtrans),
                       wa/ (WAHA, antrean, pekerja), auth, session, retention
src/services/          lapisan layanan frontend (REST bila backend aktif, localStorage bila tidak)
src/proxy.ts           penjaga halaman /admin/*
src/instrumentation.ts menyalakan pekerja latar belakang saat server start
drizzle/               migrasi SQL
scripts/               backup & uji restore
docs/                  PRD dan panduan operasional
```

## CI/CD

- `.github/workflows/ci.yml`: typecheck, lint, test, cek migrasi sinkron dengan skema, dan build (pada PR/branch).
- `.github/workflows/deploy.yml` (push ke `main`): CI → build & push image ke GHCR → jalankan migrasi (bila secret
  `DATABASE_URL` ada) → `docker compose up` di server.
- Variabel publik build diatur di GitHub: *Settings → Secrets and variables → Actions → **Variables***
  (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_SNAP_URL`).

Detail go-live, SOP gangguan, backup/restore, dan checklist kesiapan produksi: [`docs/OPERASIONAL.md`](docs/OPERASIONAL.md).
