# Warmindo Putra Vangkalan — Frontend Prototype

Prototype lengkap alur pelanggan dan admin berdasarkan PRD v2.0. Dirancang untuk eksplorasi UI/UX dan demonstrasi alur, **bukan aplikasi produksi**.

## Jalankan

### Cara paling mudah

Ekstrak ZIP, lalu buka `index.html` melalui browser modern. Tidak perlu npm install atau koneksi internet. Jika browser membatasi penyimpanan atau clipboard untuk berkas lokal, gunakan server lokal di bawah.

### Cara yang disarankan

Dengan Node.js 20 atau lebih baru, buka terminal di folder hasil ekstrak:

```bash
npm start
```

Buka **http://localhost:4173**. Tidak ada dependency yang perlu diinstal.

Alternatif dengan Python:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Gunakan alamat dan port yang sama setiap kali agar data browser tetap tersedia. `file://` dan `http://localhost:4173` menggunakan penyimpanan berbeda.

## Coba dalam 5 menit

1. Di halaman Menu, pilih Indomie Goreng, tambah telur dan catatan; tambahkan Teh Manis dingin.
2. Buka keranjang, ubah jumlah, lalu lanjut checkout.
3. Isi nama dan nomor WA contoh berformat valid; pilih secepatnya atau jam dalam satu jam mendatang.
4. Klik lanjut pembayaran, lalu **Simulasikan berhasil**. Tidak ada uang yang ditagih.
5. Periksa detail order, salin tautan privat, dan buka Riwayat order.
6. Masuk Admin dari footer/navigasi. Isi nama penjaga; tidak memerlukan password karena akses ini khusus demo.
7. Buka Pesanan → Detail. Lihat preview WA, tandai diproses, dan tandai sudah diambil.
8. Ubah menu, stok, estimasi, atau sif lalu kembali ke halaman pelanggan untuk melihat dampaknya.

## Halaman dan fitur

| Halaman | Rute | Interaksi |
|---|---|---|
| Menu pelanggan | `#/menu` | Pencarian, kategori, favorit, stok habis, modal pilihan, keranjang |
| Checkout | `#/checkout` | Nama, nomor WA, pickup secepatnya/terjadwal, catatan, validasi |
| Bukti order | `#/order/:token` | Status bayar, rincian, estimasi ambil, salin tautan, bayar ulang |
| Riwayat | `#/history` | Order lokal dan detail tanpa login |
| Akses admin demo | `#/admin` | Masuk dengan nama, logout |
| Ringkasan admin | `#/admin/overview` | Statistik dari data lokal, contoh pesanan, operasional |
| Pesanan | `#/admin/orders` | Filter/cari, proses/selesai/batal, refund, preview WA, kirim ulang demo |
| Kelola menu | `#/admin/menu` | Tambah/edit/hapus, kategori dan urutan, stok, foto lokal, opsi/harga |
| Penjaga & sif | `#/admin/shifts` | CRUD penjaga, penerima aktif, daftar serah terima |
| Pengaturan | `#/admin/settings` | Buka/tutup, estimasi, tambahan telur, koneksi WA demo, reset |

## Skenario demo yang penting

### WA gagal

Di Pengaturan, klik **Simulasikan terputus**. Buat pesanan dan simulasikan pembayaran berhasil. Order tetap lunas, tetapi notifikasi berstatus gagal. Pulihkan koneksi, lalu buka detail order admin dan pilih kirim ke sif aktif. Retry prototype dilakukan manual; worker retry otomatis belum diimplementasikan.

### Menu habis setelah dibayar

Buka detail order admin → Batalkan → isi alasan. Order tetap memiliki riwayat pembayaran lunas; status pemenuhan menjadi dibatalkan dan refund menunggu. Gunakan Catat refund manual untuk nominal sebagian/penuh dan konfirmasi transfer demo. Tidak ada transfer uang sungguhan.

### Pembayaran gagal atau kedaluwarsa

Pilih hasil yang sesuai di modal pembayaran. Keranjang tetap tersimpan. Pada detail order, gunakan Coba bayar ulang untuk menguji pemulihan.

### Pergantian sif

Buka Penjaga & sif → Aktifkan penjaga lain. Pesanan baru yang dilunasi memakai penerima aktif. Pesanan lama tetap ada; daftar serah terima memperlihatkan yang belum selesai. Pengiriman ulang dari detail order dapat diarahkan ke sif aktif.

### Dua tab

Buka pelanggan dan admin pada dua tab **di origin yang sama**. Perubahan localStorage memicu pembaruan di tab lain. Jika checkout terbuka saat data berubah, tampil peringatan agar ringkasan diperiksa kembali. Ini bukan sinkronisasi lintas pengguna/server.

## Batasan yang disengaja

- Seluruh nama menu, harga, ilustrasi, nomor, dan order awal merupakan contoh, bukan katalog resmi.
- Vanilla HTML/CSS/JavaScript tanpa framework, build step, font eksternal, atau dependency jaringan.
- Ilustrasi SVG dibuat khusus untuk prototype; bisa diganti dengan foto melalui admin. Berkas foto diperkecil sebelum disimpan lokal.
- Data berada di `localStorage`, menggunakan key `pv-prototype-v1`. Akses admin demo memakai `sessionStorage`.
- Autentikasi demo bukan proteksi. Semua data dan logika dapat dilihat/diubah dari browser. Jangan memasukkan data pribadi atau kredensial produksi.
- Midtrans dan WAHA **tidak terhubung**. Tidak ada request pembayaran atau pengiriman pesan nyata.
- Tautan privat demo hanya membuka data yang tersedia di browser/origin tersebut; tidak dapat digunakan untuk berbagi order antarperangkat. Produk final memerlukan backend dan token akses aman.
- Tidak ada callback/webhook, antrean pengiriman persisten, retry otomatis, backup, rekonsiliasi gateway, atau audit server nyata.
- Pesan siap ke pelanggan disediakan sebagai draft yang dapat disalin; prototype tidak mengirimnya.
- Tampilan responsif, tetapi belum diverifikasi secara visual menggunakan browser otomatis dalam lingkungan pengerjaan ini. Checklist QA manual tersedia di `QA.md`.
- Target satu jam dan estimasi digunakan untuk demo. Kebijakan pembayaran terlambat/slot produksi masih mengikuti keputusan terbuka PRD.

## Struktur proyek

```text
warmindo-prototype/
  index.html          Halaman masuk
  styles.css          Design system dan responsive layout
  core.js             State, kalkulasi, validasi, order, pembayaran simulasi
  app.js              Rendering halaman, modal, dan interaksi
  assets/favicon.svg  Identitas visual lokal
  server.cjs          Server statis lokal tanpa dependency
  package.json        Perintah jalankan dan verifikasi
  tests/              Pengujian logic dan rendering HTML tanpa browser
  docs/PRD-v2.md       Dokumen kebutuhan sebagai referensi
  QA.md               Checklist uji manual
  README.md           Panduan ini
```

## Verifikasi

```bash
npm run check
npm test
```

Delapan tes meliputi kalkulasi/snapshot, validasi checkout, batas waktu, pembayaran berulang, kegagalan WA, pemulihan pembayaran, rendering rute, dan escaping input. Smoke test menggunakan DOM minimal untuk memeriksa HTML; tidak mengukur layout atau perilaku browser asli.

## Arah implementasi berikutnya

1. Konfirmasi katalog/harga asli dan kebijakan terbuka dalam PRD.
2. Ganti operasi dalam `core.js` dengan API backend; validasi harga dan pembayaran harus pindah ke server.
3. Tambahkan autentikasi dan otorisasi admin nyata.
4. Integrasikan Midtrans sandbox dan webhook terverifikasi/idempoten.
5. Integrasikan WAHA homeserver melalui backend saja; API key tidak boleh dimasukkan ke frontend.
6. Implementasikan penyimpanan order/token privat, tugas WA persisten, retry, monitoring, serta backup.
7. Uji browser nyata dan perangkat HP sebelum digunakan pelanggan.
