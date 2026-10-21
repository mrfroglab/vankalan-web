# PRD — Pemesanan Online Warmindo Putra Vangkalan

| Metadata | Keterangan |
|---|---|
| Versi | 2.0 — MVP |
| Tanggal | 21 Oktober 2026 |
| Pemilik produk / developer | Bang Jan |
| Pemilik usaha | Aa Iis |
| Status | Draft implementasi; keputusan utama disepakati, rincian terbuka tercantum di bagian 17 |
| Bahasa / zona waktu | Bahasa Indonesia / Asia/Jakarta (WIB) |
| Dasar | PRD v1.0 dan keputusan diskusi lanjutan |

> Dokumen ini menggantikan PRD v1.0. Bagian berlabel **usulan teknis/operasional** merupakan rekomendasi implementasi, bukan keputusan bisnis yang sudah dikonfirmasi. Hal yang belum ditentukan tidak boleh dianggap telah disetujui.

## 1. Ringkasan produk

Warmindo Putra Vangkalan membutuhkan web pemesanan yang memungkinkan pelanggan memilih menu, membayar, dan menentukan waktu pengambilan sebelum datang. Tujuan utamanya mengurangi waktu pelanggan menunggu di warung: pelanggan datang untuk mengambil makanan yang disiapkan mendekati waktu pengambilan.

MVP hanya melayani **ambil sendiri (pickup)**. Pelanggan tidak perlu membuat akun. Setelah pembayaran terverifikasi, pesanan tercatat di sistem dan ringkasannya dikirim otomatis melalui WhatsApp kepada penjaga sif aktif. Penjaga menghubungi pelanggan secara manual melalui WhatsApp ketika makanan siap atau ketika ada masalah pesanan.

WhatsApp menggunakan **WAHA versi gratis dengan engine WEBJS**, dijalankan di homeserver Bang Jan menggunakan subdomain dari domain yang sudah dimiliki. Database pesanan tetap menjadi sumber pencatatan utama; pesan WhatsApp adalah sarana pemberitahuan operasional.

## 2. Masalah, tujuan, dan ukuran keberhasilan

### 2.1 Masalah yang hendak diselesaikan

- Pelanggan harus menunggu di warung setelah memesan secara langsung.
- Pelanggan belum memiliki alur sederhana untuk melihat menu, membayar, dan menentukan waktu ambil dari jauh.
- Pesanan perlu diterima penjaga dengan rincian yang konsisten dan status pembayaran yang dapat diverifikasi.
- Ketersediaan menu dan estimasi persiapan perlu bisa diperbarui oleh penjaga.

Belum ada pengukuran awal waktu tunggu atau tingkat kesalahan pesanan. Klaim besarnya pengurangan antrean harus divalidasi melalui pemakaian, bukan diasumsikan.

### 2.2 Tujuan dan indikator

| Tujuan | Indikator | Cara mengukur |
|---|---|---|
| Membuktikan minat terhadap pemesanan online | Target 3 pesanan online selesai per hari pada minggu kedua | Hitung order yang sudah diambil, tidak termasuk transaksi uji atau pesanan dibatalkan |
| Mempermudah pemesanan | Target alur memilih menu sampai menyelesaikan pembayaran kurang dari 3 menit pada pengujian alur normal | Uji pengguna; waktu jaringan/gateway dicatat terpisah |
| Mencegah pesanan lunas hilang dari pencatatan | Semua pembayaran terverifikasi memiliki order yang dapat dilihat admin | Rekonsiliasi transaksi pembayaran dan database |
| Mendukung pengambilan tepat waktu | Catat waktu ambil yang disepakati dan waktu pesanan selesai/diambil | Evaluasi sederhana bersama penjaga; target ketepatan belum ditentukan |
| Menghemat biaya | Tanpa langganan gateway WA atau VPS tambahan untuk WAHA | Manfaatkan homeserver dan domain yang sudah tersedia |

**Definisi evaluasi yang diusulkan:** minggu kedua adalah hari ke-8 sampai ke-14 sejak peluncuran. Target dinilai sebagai rata-rata minimal 3 order selesai/hari atau 21 order selama tujuh hari, sambil tetap melaporkan jumlah tiap hari. Interpretasi rata-rata ini perlu disepakati sebelum evaluasi.

## 3. Pengguna dan tanggung jawab

| Pengguna | Kebutuhan | Tanggung jawab |
|---|---|---|
| Pelanggan | Menu jelas, tanpa login, pembayaran mudah, waktu ambil, bukti pesanan | Mengisi nomor WA yang benar, membayar, datang mengambil |
| Aa Iis / penjaga sif | Pesanan lunas masuk ke WA, pengelolaan menu sederhana | Memilih sif aktif, memperbarui stok dan estimasi, menyiapkan makanan, menghubungi pelanggan, menandai order selesai |
| Bang Jan | Sistem sederhana dan dapat dirawat | Implementasi, konfigurasi homeserver, pemeliharaan WAHA, pemantauan teknis, backup |

Warung memiliki pergantian sif. Operasional 24 jam tidak berarti Aa Iis seorang diri memantau sepanjang hari. Penerima notifikasi dipilih manual sesuai penjaga yang bertugas.

## 4. Ruang lingkup MVP

### 4.1 Termasuk

- Web mobile-first berbahasa Indonesia, tanpa login pelanggan.
- Daftar menu per kategori, foto, harga, ketersediaan.
- Pilihan panas/dingin untuk minuman yang mendukungnya; mi tanpa telur atau dengan tambahan telur.
- Keranjang, catatan, perhitungan harga di server.
- Checkout pickup, nama dan nomor WA wajib, pemilihan waktu pengambilan.
- Pembayaran online melalui satu gateway; Midtrans Snap tetap menjadi baseline dari PRD awal.
- Riwayat order pada browser yang sama dan tautan privat per order.
- Notifikasi otomatis ke WA penjaga aktif melalui WAHA + WEBJS.
- Dashboard admin, pengaturan estimasi, buka/tutup pemesanan online, pengelolaan penerima sif.
- Pengiriman ulang notifikasi gagal dan penanda masalah di dashboard.
- Penanganan refund secara manual oleh penjaga; pencatatan status penyelesaian di admin.

### 4.2 Tidak termasuk

- Makan di tempat, nomor meja, delivery, ongkir, atau kurir.
- Sistem penggabungan antrean online dengan antrean pelanggan langsung.
- Tampilan posisi antrean untuk pelanggan.
- Akun pelanggan, OTP login, atau sinkronisasi riwayat antarperangkat.
- Pengingat mulai memasak, baik otomatis maupun terjadwal.
- Pesan otomatis “makanan siap” kepada pelanggan; penjaga mengirim secara manual.
- Stok kuantitatif, reservasi bahan, inventaris, atau pembelian bahan baku.
- Promo, voucher, loyalitas, multi-cabang, laporan lanjutan, printer, aplikasi native.
- Refund otomatis melalui aplikasi.
- Banyak gateway pembayaran atau banyak nomor pengirim WA.
- Sistem hak akses pegawai yang kompleks; detail akun admin masih perlu ditentukan.

## 5. Keputusan bisnis dan aturan utama

### 5.1 Pemesanan dan pembayaran

1. Pesanan hanya untuk ambil sendiri.
2. Pelanggan membayar penuh di muka. Pembayaran terverifikasi otomatis memasukkan pesanan ke daftar kerja, tanpa persetujuan penjaga terlebih dahulu.
3. Biaya transaksi gateway ditanggung warung. Total pelanggan adalah harga item dan tambahan yang ditampilkan; tidak ada biaya gateway tambahan pada checkout.
4. Backend menghitung harga dari data menu aktif. Nilai dari browser bukan sumber kebenaran.
5. Nomor order, harga, nama item, pilihan, dan jumlah disimpan sebagai snapshot agar riwayat tidak berubah ketika menu diedit.
6. Perubahan harga atau ketersediaan sejak item masuk keranjang harus ditampilkan sebelum pembayaran dibuat.
7. WhatsApp yang berisi “lunas” bukan bukti otoritatif; status pembayaran berasal dari verifikasi server.

### 5.2 Waktu pengambilan

- Pelanggan memilih **secepatnya** atau **pilih jam**.
- Estimasi awal secepatnya adalah 10 menit, bukan jaminan makanan siap tepat 10 menit.
- Penjaga dapat mengubah estimasi untuk pesanan baru saat ramai.
- Waktu pilihan maksimal satu jam ke depan. Makanan disiapkan mendekati waktu tersebut supaya fresh.
- Tidak ada pengingat mulai memasak. Penjaga bertanggung jawab memantau waktu ambil pada WA dan dashboard.
- Semua waktu ditampilkan dalam WIB; pesanan melintasi tengah malam tetap menyimpan tanggal lengkap.
- Jika estimasi berubah saat checkout, server menghitung ulang sebelum memulai pembayaran dan meminta pelanggan menerima perubahan.
- Perubahan waktu setelah lunas dikonfirmasi penjaga lewat WA; jangan diam-diam mengganti janji waktu pelanggan.

**Usulan aturan implementasi:** rentang jam yang dapat dipilih adalah waktu server saat checkout ditambah estimasi aktif sampai satu jam ke depan. Untuk “secepatnya”, target dihitung dari waktu pembayaran terverifikasi ditambah estimasi checkout. Jika pembayaran untuk jam tertentu terlambat sehingga waktu persiapan tidak cukup, tampilkan penanda “perlu konfirmasi waktu” di admin dan minta penjaga menghubungi pelanggan. Batas durasi pembayaran harus dikonfigurasi sebelum rilis. Jika estimasi aktif melampaui satu jam, tutup sementara checkout sampai tersedia slot yang valid; perilaku ini perlu persetujuan operasional.

### 5.3 Menu dan variasi

- Menu dan harga hanya diisi dari daftar yang telah dikonfirmasi pemilik; jangan mengarang katalog produksi.
- Minuman menampilkan opsi panas/dingin hanya jika memang tersedia. Harga tiap opsi dapat berbeda.
- Jenis mi goreng/kuah mengikuti produk yang benar-benar dijual; tidak semua produk otomatis memiliki kedua pilihan.
- Mi dapat dipesan tanpa telur atau dengan telur, dengan harga tambahan yang jelas.
- Tipe/cara masak telur belum ditentukan dan tidak diasumsikan sebagai fitur wajib.
- Pilihan yang mengubah harga harus terstruktur, bukan bergantung pada catatan bebas.
- Item dengan pilihan atau catatan berbeda menjadi baris keranjang berbeda.
- Ketersediaan menggunakan status tersedia/habis; pengecekan ulang dilakukan saat checkout, tetapi tidak menjamin bahan belum terjual secara langsung.

### 5.4 Menu habis setelah pembayaran

1. Penjaga menghubungi nomor WA pelanggan dan menjelaskan item yang tidak tersedia.
2. Penjaga meminta informasi rekening melalui chat bila diperlukan dan memproses refund manual.
3. Nomor rekening tidak perlu disimpan di aplikasi MVP.
4. Admin mencatat nominal, alasan, waktu, dan status refund agar pesanan tidak dianggap selesai secara keliru.
5. Refund tidak langsung ditandai selesai ketika baru dijanjikan; perlu konfirmasi transfer oleh penjaga.
6. Aturan refund sebagian vs seluruh order, tenggat penyelesaian, dan penanggung biaya transfer masih perlu ditentukan.

### 5.5 Sif dan buka/tutup

- Admin memilih nomor penerima aktif dari daftar penjaga yang telah didaftarkan.
- Satu nomor pengirim sistem mengirim ke penerima aktif; setiap penjaga tidak memerlukan instance WAHA sendiri.
- Tombol buka/tutup mengatur **penerimaan pesanan online**, bukan status fisik warung.
- Saat tutup, menu tetap bisa dilihat, tetapi checkout baru ditolak juga di server.
- Order lunas yang sudah ada tetap harus ditangani setelah pemesanan ditutup.
- Pergantian sif tidak menghapus order atau mengubah status pembayaran.

**Usulan operasional:** pergantian sif menampilkan daftar pesanan lunas yang belum selesai untuk diserahterimakan. Nomor penerima setiap notifikasi disimpan untuk pelacakan. Pengiriman ulang ke penjaga pengganti harus eksplisit, bukan membuat pesanan baru. Jika belum ada penerima aktif, checkout baru diblokir dengan pesan yang jelas.

## 6. User stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-01 | Pelanggan | Melihat menu dan harga yang tersedia | Bisa memilih sebelum datang |
| US-02 | Pelanggan | Memilih panas/dingin atau tambahan telur | Pesanan dan harga sesuai |
| US-03 | Pelanggan | Mengubah keranjang dan catatan per item | Detail masakan jelas |
| US-04 | Pelanggan | Menentukan waktu ambil maksimal satu jam ke depan | Tidak perlu lama menunggu di warung |
| US-05 | Pelanggan | Membayar tanpa membuat akun | Proses cepat |
| US-06 | Pelanggan | Membuka bukti order lewat tautan privat | Bisa memeriksa pembayaran dan menunjukkan pesanan |
| US-07 | Pelanggan | Melihat riwayat di browser yang sama | Bisa membuka order sebelumnya |
| US-08 | Penjaga | Menerima rincian order lunas otomatis melalui WA | Bisa segera menangani pesanan |
| US-09 | Penjaga | Mengubah stok, estimasi, dan buka/tutup online | Pesanan sesuai kapasitas pelayanan |
| US-10 | Penjaga | Memilih penerima sif aktif | Notifikasi masuk ke orang yang bertugas |
| US-11 | Penjaga | Melihat notifikasi gagal dan mencoba kembali | Tidak ada order terlewat |
| US-12 | Penjaga | Mencatat selesai, pembatalan, dan refund | Riwayat dan evaluasi penjualan akurat |
| US-13 | Developer | Memantau koneksi WAHA dan memulihkan sesi | Gangguan dapat ditangani |

## 7. Alur utama

### 7.1 Pelanggan

1. Membuka web dan melihat status pemesanan serta estimasi persiapan.
2. Memilih menu, opsi, jumlah, dan catatan.
3. Membuka keranjang dan checkout.
4. Mengisi nama, nomor WA, serta waktu pengambilan.
5. Backend memvalidasi toko, menu, opsi, harga, waktu, dan penerima sif.
6. Jika ada perubahan, pelanggan melihat ringkasan baru dan menyetujuinya.
7. Backend menyimpan order PENDING dan membuat transaksi pembayaran.
8. Pelanggan membayar melalui gateway.
9. Server memverifikasi pemberitahuan pembayaran dan menandai PAID.
10. Sistem mencatat tugas pengiriman WA secara persisten lalu mengirim ke penjaga aktif.
11. Pelanggan melihat bukti pembayaran dan tautan privat order tanpa perlu menekan “Kirim WA”.
12. Penjaga menyiapkan mendekati waktu ambil dan mengirim chat siap secara manual.
13. Pelanggan mengambil pesanan; penjaga menandainya selesai/diambil.

### 7.2 Penjaga sif

1. Login admin, pilih penerima aktif, periksa order belum selesai.
2. Perbarui ketersediaan, estimasi persiapan, dan status buka/tutup online.
3. Terima WA pesanan lunas; buka detail admin bila perlu.
4. Jika ada masalah menu atau waktu, hubungi pelanggan secara manual.
5. Siapkan dan serahkan makanan; catat penyelesaian.
6. Saat pindah sif, serahkan order yang belum selesai kepada petugas berikutnya.

### 7.3 Gangguan WA

1. Pembayaran dan order tetap tersimpan walau WAHA tidak tersedia.
2. Tugas pengiriman dicoba ulang dengan jeda; kegagalan terlihat di dashboard.
3. Penjaga memantau dashboard sebagai jalur cadangan.
4. Usulan: jika tidak ada petugas yang bisa memantau jalur cadangan, tutup pemesanan online secara manual.
5. Saat koneksi pulih, proses tugas tertunda dengan pemeriksaan status order agar tidak mengirim instruksi memasak untuk order yang sudah selesai/dibatalkan.

## 8. Functional requirements

Prioritas **Must** wajib untuk peluncuran; **Should** dapat ditunda secara eksplisit. Semua requirement berikut merupakan spesifikasi MVP, dengan detail usulan mengikuti penandaan pada bagian terkait.

### 8.1 Pelanggan

| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Menu per kategori dengan navigasi mudah di HP, nama, foto/fallback, deskripsi, dan harga | Must |
| FR-02 | Menu habis tidak dapat dipesan; server memvalidasi kembali | Must |
| FR-03 | Pilihan minuman dan telur tervalidasi; harga pilihan tampil sebelum ditambahkan | Must |
| FR-04 | Keranjang mendukung tambah, kurang, hapus, catatan item dan catatan order | Must |
| FR-05 | Keranjang bertahan setelah refresh pada browser yang sama | Must |
| FR-06 | Nama dan nomor WA wajib; format dinormalisasi dan kesalahan ditampilkan | Must |
| FR-07 | Pilihan secepatnya/pilih jam dengan batas waktu dan estimasi dari server | Must |
| FR-08 | Perubahan harga, ketersediaan, dan waktu meminta peninjauan ulang sebelum pembayaran | Must |
| FR-09 | Pembayaran online dan status menunggu, berhasil, gagal, kedaluwarsa | Must |
| FR-10 | Tautan privat ber-token acak untuk detail order; tanpa login | Must |
| FR-11 | Riwayat lokal pada browser/perangkat yang sama, termasuk akses ulang tautan order | Must |
| FR-12 | Tombol salin tautan/nomor order dan informasi kontak warung | Must |
| FR-13 | Toko online tutup menonaktifkan checkout, menu tetap terlihat | Must |
| FR-14 | Percobaan pembayaran ulang aman tanpa menduplikasi order lunas | Must |

Riwayat lokal tidak dijanjikan tersedia setelah data browser dihapus atau pindah perangkat. Tautan privat dapat dibuka kembali jika pelanggan menyimpannya. Kepemilikan tautan memberikan akses ke detail order; jangan menggunakan nomor order berurutan sebagai token akses. Jangan menyediakan pencarian riwayat publik hanya berdasarkan nomor WA.

### 8.2 Pembayaran dan backend

| ID | Requirement | Prioritas |
|---|---|---|
| FR-20 | Buat order sebelum transaksi gateway dan simpan referensi transaksi | Must |
| FR-21 | Hitung ulang harga di server, simpan snapshot harga serta pilihan | Must |
| FR-22 | Verifikasi notifikasi gateway, identitas transaksi, nominal, dan status sebelum PAID | Must |
| FR-23 | Pemrosesan webhook idempoten: kiriman berulang tidak menggandakan order atau tugas WA | Must |
| FR-24 | Callback browser tidak dapat menetapkan status lunas | Must |
| FR-25 | Simpan perubahan PAID dan tugas WA secara atomik atau dengan mekanisme pemulihan setara | Must |
| FR-26 | Tangani status pembayaran terlambat/tidak berurutan tanpa menurunkan PAID menjadi PENDING | Must |
| FR-27 | Sediakan rekonsiliasi pembayaran yang belum pasti ketika webhook terlambat | Must |
| FR-28 | Pisahkan status pembayaran, pemenuhan, notifikasi, dan refund | Must |

### 8.3 WhatsApp

| ID | Requirement | Prioritas |
|---|---|---|
| FR-30 | Gunakan WAHA + WEBJS pada homeserver, satu sesi pengirim | Must |
| FR-31 | Kirim otomatis hanya setelah PAID, kepada penerima sif aktif | Must |
| FR-32 | Pesan berisi nomor order, nama/WA pelanggan, item/pilihan, catatan, total, status bayar, waktu ambil | Must |
| FR-33 | Simpan tujuan, jumlah percobaan, waktu, ID pesan bila tersedia, dan error pengiriman | Must |
| FR-34 | Coba ulang kegagalan sementara dengan batas dan jeda yang dikonfigurasi | Must |
| FR-35 | Tampilkan pengiriman tertunda/gagal dan tombol kirim ulang di admin | Must |
| FR-36 | Tampilkan kondisi sesi WA terputus dan kebutuhan scan QR ulang | Must |
| FR-37 | Kredensial WAHA hanya di backend; dashboard WAHA bukan halaman publik pelanggan | Must |

Usulan kebijakan awal retry: setelah 30 detik, 2 menit, dan 5 menit; sesudah itu tandai perlu tindakan manual. Nilai ini dapat diubah setelah pengujian. Respons API diterima tidak sama dengan pesan telah dibaca penjaga. Timeout yang tidak jelas hasilnya dapat menyebabkan pesan ganda; sertakan nomor order konsisten, hindari retry buta, dan jangan menjanjikan pengiriman exactly-once.

Contoh format pesan (data ilustrasi, bukan daftar harga produksi):

```text
PESANAN ONLINE — WARMINDO PUTRA VANGKALAN
No. order: PV-20261021-0042
Pembayaran: LUNAS
Pelanggan: Raka
WA pelanggan: [nomor pelanggan]
Ambil: 21 Oktober 2026, 19.00 WIB

1x [Menu mi] — dengan telur — Rp [harga]
1x [Minuman] — dingin — Rp [harga]
Catatan item: tidak pedas
Catatan order: -
Total dibayar: Rp [total]

Siapkan mendekati waktu ambil.
Hubungi pelanggan secara manual ketika siap.
Detail admin: [tautan yang memerlukan login]
```

### 8.4 Admin

| ID | Requirement | Prioritas |
|---|---|---|
| FR-40 | Login admin dan proteksi seluruh API mutasi | Must |
| FR-41 | CRUD kategori dan menu, upload foto, harga serta pilihan sederhana | Must |
| FR-42 | Toggle tersedia/habis dengan langkah minimal | Must |
| FR-43 | Toggle buka/tutup pemesanan online | Must |
| FR-44 | Ubah estimasi persiapan untuk checkout baru | Must |
| FR-45 | Kelola daftar penjaga dan pilih satu penerima aktif secara manual | Must |
| FR-46 | Daftar order dengan filter status; waktu ambil dan order belum selesai terlihat jelas | Must |
| FR-47 | Auto-refresh daftar order dan indikator pembaruan terakhir | Must |
| FR-48 | Detail order dan tautan buka chat WA pelanggan | Must |
| FR-49 | Tandai diproses, selesai/diambil, atau dibatalkan dengan alasan | Must |
| FR-50 | Catat refund manual: nominal, alasan, pending/selesai, waktu penyelesaian | Must |
| FR-51 | Lihat kegagalan WA dan kirim ulang tanpa membuat order baru | Must |
| FR-52 | Pengaturan nama toko, kontak pelanggan, dan informasi pengambilan | Should |

Usulan auto-refresh: setiap 15–30 detik saat dashboard aktif, dengan tombol refresh manual. Ini adalah dashboard internal, bukan antrean publik pelanggan.

## 9. Status dan model data konseptual

### 9.1 Status terpisah

| Dimensi | Status | Aturan |
|---|---|---|
| Pembayaran | PENDING, PAID, FAILED, EXPIRED | Pemetaan status provider diverifikasi saat integrasi |
| Pemenuhan | NEW, PREPARING, COMPLETED, CANCELLED | Aktif untuk order lunas; COMPLETED berarti sudah diserahkan/diambil |
| Notifikasi | QUEUED, SENDING, SENT, FAILED, UNKNOWN | SENT berarti keberhasilan yang dilaporkan layanan, bukan sudah dibaca; UNKNOWN untuk hasil ambigu |
| Refund manual | NONE, PENDING, PARTIAL_REFUNDED, FULL_REFUNDED | Catat nominal aktual dan alasan; jangan menyamakan janji refund dengan transfer selesai |

Pembayaran PAID merupakan fakta historis dan tidak diubah menjadi FAILED karena makanan habis. Pembatalan dan refund dicatat terpisah. Order yang sudah diproses tidak mundur hanya karena webhook lama datang. Status siap tidak wajib di web karena pemberitahuannya melalui chat manual.

### 9.2 Entitas minimum

| Entitas | Data penting |
|---|---|
| Category | ID, nama, urutan, aktif |
| MenuItem | ID, kategori, nama, deskripsi, foto, harga dasar, ketersediaan, aktif |
| MenuOption | ID, item, kelompok pilihan, nilai, perubahan harga, tersedia |
| Order | ID internal, nomor publik, hash token privat, nama, nomor WA, waktu dibuat/lunas/ambil, jenis waktu ambil, snapshot estimasi, total, status |
| OrderItem | Snapshot nama, pilihan, harga satuan, jumlah, subtotal, catatan |
| PaymentAttempt | Order, referensi gateway unik, nominal, status, waktu, informasi verifikasi |
| NotificationJob | Order, penerima, status, percobaan, jadwal retry, ID pesan, error terakhir |
| ShiftRecipient | Nama penjaga, nomor WA, aktif/nonaktif |
| StoreSettings | Status online, estimasi, penerima aktif, kontak, zona waktu |
| RefundRecord | Order, nominal, alasan, status, waktu, penanda petugas |
| AuditEvent | Perubahan penting: harga, sif, tutup/buka, status order, refund |

Harga disimpan sebagai integer rupiah. Timestamp disimpan konsisten dan ditampilkan dalam WIB. Menu yang sudah pernah dipesan diarsipkan; penghapusan menu tidak menghilangkan riwayat order. Penguncian transaksi/constraint diperlukan agar klik bayar berulang tidak membuat pemrosesan ganda.

## 10. Arsitektur dan pilihan teknologi

### 10.1 Keputusan yang sudah ditetapkan

- WAHA versi gratis, engine WEBJS.
- Homeserver Bang Jan untuk layanan WAHA.
- Subdomain dari domain Bang Jan yang sudah tersedia; nama aktual belum ditetapkan.
- Satu nomor pengirim khusus sistem, penerima mengikuti sif manual.
- Tidak menggunakan Fonnte berlangganan atau alur wa.me manual sebagai jalur utama.

### 10.2 Baseline implementasi yang belum seluruhnya dikunci

| Lapisan | Baseline | Status |
|---|---|---|
| Web dan backend | Next.js + TypeScript atau framework yang paling dikuasai developer | Usulan |
| Styling | Tailwind CSS | Usulan |
| Database/Auth/Storage | PostgreSQL, misalnya Supabase | Usulan; penyedia belum diputuskan |
| Pembayaran | Midtrans Snap | Baseline PRD awal; kesiapan merchant dan kanal perlu dikonfirmasi |
| Pengiriman WA | WAHA + WEBJS | Disepakati |
| Hosting WAHA | Homeserver dengan proses/container persisten | Disepakati |
| Hosting web/API/database | Belum ditentukan | Jangan otomatis mengasumsikan ikut homeserver |
| Worker notifikasi | Proses persisten yang mengambil tugas dari database | Usulan; lokasi mengikuti keputusan hosting |

Urutan tanggung jawab: browser mengakses backend; backend menyimpan order dan berkomunikasi dengan gateway; webhook pembayaran memperbarui database; worker memanggil WAHA; WAHA mengirim ke penjaga. Browser pelanggan tidak memanggil WAHA langsung.

WEBJS menggunakan browser di belakang layar. WAHA perlu proses yang tetap berjalan dan penyimpanan sesi persisten, sehingga komponen ini tidak mengikuti asumsi serverless murni pada PRD lama. Ukuran CPU/RAM homeserver harus dibuktikan melalui uji satu sesi, bukan ditetapkan berdasarkan jumlah pelanggan terdaftar saja.

## 11. Non-functional requirements

### 11.1 Performa dan pengalaman pengguna

- Mobile-first, tombol mudah ditekan, teks terbaca, harga dan waktu ambil mudah ditemukan.
- Target halaman menu dapat digunakan kurang dari 3 detik pada pengujian 4G representatif; catat perangkat dan kondisi uji.
- Foto dikompres, dibatasi ukuran upload, dan dimuat bertahap.
- Keranjang tidak hilang saat refresh; status pembayaran dapat dipulihkan melalui tautan order.
- Cache menu tidak boleh melewati validasi harga dan stok saat checkout.
- Perubahan stok/harga membatalkan atau memperbarui cache agar tidak menampilkan informasi lama terlalu lama.
- Validasi form jelas; input nomor WA valid secara format tidak menjamin nomor tersebut benar-benar milik pelanggan.

### 11.2 Keamanan dan privasi

- HTTPS pada web, endpoint pembayaran, dan koneksi layanan yang melintasi jaringan publik.
- API key, kunci gateway, token admin, dan sesi WA disimpan di sisi server.
- Akses WAHA dibatasi ke backend/jaringan yang diizinkan; subdomain bukan pengganti autentikasi.
- Dashboard administrasi WAHA dan QR login dilindungi, tidak dapat diakses pelanggan.
- Tautan privat menggunakan token acak kuat; jangan mencatat token lengkap di log/analitik atau membocorkannya melalui referer.
- API pelanggan hanya mengembalikan order yang sesuai token, dengan data pribadi seminimal mungkin.
- Rate limit pada checkout, akses order, login, dan pembuatan transaksi.
- Validasi upload file dan input catatan; jangan menampilkan HTML dari input pengguna tanpa sanitasi.
- Simpan nama, nomor WA, dan rincian order hanya untuk keperluan pelayanan; tampilkan pemberitahuan singkat penggunaan nomor untuk komunikasi order.
- Nomor rekening refund dibahas melalui chat dan tidak diwajibkan masuk database aplikasi.
- Masa retensi data, penghapusan, dan masa berlaku tautan privat harus ditentukan sebelum peluncuran.

### 11.3 Keandalan dan pemulihan

- Semua order lunas tetap tersedia walau notifikasi gagal.
- Tugas WA persisten sehingga restart tidak menghapus pekerjaan tertunda.
- Sesi WAHA disimpan pada volume persisten dengan akses terbatas.
- Usulan: restart otomatis layanan, health check, peringatan sesi terputus, dan backup database harian.
- Backup harus diuji pemulihannya minimal sekali sebelum produksi; lokasi dan retensinya ditetapkan sebelum rilis.
- Gangguan internet/listrik homeserver tetap mungkin terjadi; tidak ada klaim SLA 24/7 yang belum diuji.
- Status belum pasti dari pembayaran tidak boleh langsung dianggap gagal; sediakan rekonsiliasi.
- Pengiriman yang belum pasti tidak boleh dianggap sudah diterima penjaga.

## 12. Anggaran dan operasional

| Komponen | Keputusan / implikasi |
|---|---|
| Lisensi/layanan WA | Menggunakan edisi gratis WAHA; tidak menganggarkan langganan gateway |
| Mesin WAHA | Homeserver yang sudah dimiliki; tidak membeli VPS khusus WA untuk MVP |
| Domain | Memakai subdomain domain yang sudah ada; perpanjangan domain tetap biaya pemilik |
| Operasional homeserver | Listrik, internet, dan perawatan tetap ada; nominal belum dihitung |
| Nomor pengirim | Nomor khusus; biaya aktivasi/masa aktif sesuai operator |
| Gateway pembayaran | Biaya transaksi ditanggung warung; tarif aktual diverifikasi saat aktivasi merchant |
| Web/API/database | Anggaran menunggu keputusan penyedia dan hosting |
| Pengembangan | Ditangani Bang Jan; biaya jasa tidak ditentukan dalam PRD ini |

Gratis software tidak berarti seluruh sistem tanpa biaya. Tidak ada batas kuota pesan atau jaminan bebas pemblokiran yang dijanjikan oleh PRD ini. Kebutuhan awal rendah (target tiga order selesai per hari), tetapi beban puncak dan penggunaan browser WAHA tetap harus diuji.

## 13. Skenario kegagalan dan penanganan

| Skenario | Perilaku yang diwajibkan |
|---|---|
| Pelanggan menutup halaman setelah bayar | Webhook tetap memproses; order dapat dibuka dari riwayat lokal/tautan yang disimpan |
| Webhook dikirim berulang | Tidak ada order, perubahan stok semu, atau tugas WA ganda |
| Pembayaran sukses tetapi webhook terlambat | Tampilkan status sedang diverifikasi; rekonsiliasi sebelum meminta bayar lagi |
| WAHA mati atau sesi terputus | Order tetap tercatat, retry/penanda masalah aktif, dashboard jadi cadangan |
| Timeout WAHA dengan hasil tidak diketahui | Tandai UNKNOWN, periksa sebelum retry; nomor order konsisten untuk mengenali duplikasi |
| Stok berubah sebelum pembayaran dibuat | Tolak item tidak tersedia dan minta pelanggan meninjau keranjang |
| Bahan habis setelah lunas | Penjaga menghubungi pelanggan dan menangani refund manual |
| Toko tutup ketika transaksi masih pending | Blokir transaksi baru; pembayaran yang terlanjur sukses tetap dicatat dan harus ditangani, bukan dibuang |
| Pembayaran terlambat untuk waktu ambil | Tandai perlu konfirmasi; penjaga menghubungi pelanggan |
| Sif berubah saat ada order terbuka | Order tetap terlihat dan diserahterimakan; penerima notifikasi historis tercatat |
| Pelanggan tidak datang | Kebijakan waktu simpan/no-show masih perlu ditetapkan; jangan otomatis tandai sudah diambil |
| Nomor WA pelanggan salah | Detail order tetap tersedia; prosedur kontak alternatif belum ditentukan |
| Harga/menu diedit setelah lunas | Snapshot order tetap sama |

## 14. Acceptance criteria / Definition of Done

### 14.1 Menu dan checkout

- [ ] Kategori, harga, foto/fallback, dan status habis terlihat di HP.
- [ ] Pilihan panas/dingin dan telur hanya muncul pada menu yang relevan.
- [ ] Mi dapat dibeli tanpa telur; tambahan berbayar dihitung di server.
- [ ] Item dengan pilihan/catatan berbeda tidak digabung secara salah.
- [ ] Keranjang bertahan setelah refresh.
- [ ] Nama dan nomor WA wajib; tidak ada nomor meja atau pilihan dine-in.
- [ ] Waktu ambil tervalidasi di server, termasuk batas satu jam dan pergantian tanggal WIB.
- [ ] Perubahan estimasi/harga meminta persetujuan sebelum transaksi dibuat.
- [ ] Toko online tutup menolak checkout langsung melalui API sekalipun tombol browser dimanipulasi.

### 14.2 Pembayaran

- [ ] Order PENDING tercatat sebelum pembayaran dimulai.
- [ ] Manipulasi nominal dari browser tidak mengubah tagihan resmi.
- [ ] Status PAID hanya berasal dari verifikasi server yang valid.
- [ ] Signature/identitas/nominal yang tidak sesuai tidak melunasi order.
- [ ] Webhook berulang tidak menghasilkan tugas notifikasi atau order ganda.
- [ ] Webhook terlambat dan status tidak berurutan ditangani dengan benar.
- [ ] Pembayaran gagal/kedaluwarsa dapat dipulihkan sesuai aturan percobaan pembayaran tanpa menagih order lunas lagi.
- [ ] Pelanggan tidak dibebani biaya gateway tambahan.

### 14.3 WhatsApp dan sif

- [ ] PAID menghasilkan notifikasi otomatis tanpa aksi kirim dari pelanggan.
- [ ] Penerima sesuai penjaga aktif dan pesan menyertakan waktu ambil serta kontak pelanggan.
- [ ] Mengganti sif mengubah penerima order berikutnya; order lama tetap dapat ditangani.
- [ ] WAHA mati saat pembayaran tidak menyebabkan order hilang.
- [ ] Retry, penanda FAILED/UNKNOWN, dan kirim ulang manual berfungsi.
- [ ] Restart worker tidak menghapus tugas tertunda.
- [ ] Sesi WAHA bertahan setelah restart normal dengan volume tetap tersedia.
- [ ] Tidak ada pengingat memasak atau notifikasi siap otomatis yang tidak diminta.

### 14.4 Riwayat dan admin

- [ ] Riwayat dapat dibuka tanpa login pada browser yang sama.
- [ ] Tautan privat valid membuka order yang tepat; token salah tidak membuka order lain.
- [ ] API admin menolak pengguna tanpa autentikasi.
- [ ] Penjaga dapat mengubah menu, stok, estimasi, dan status online.
- [ ] Semua order lunas muncul di dashboard tanpa bergantung keberhasilan WA.
- [ ] Order selesai hanya dihitung setelah diambil/diserahkan.
- [ ] Pembatalan dan refund manual tercatat terpisah dari pembayaran.

### 14.5 Kesiapan produksi

- [ ] Alur end-to-end diuji di sandbox lalu transaksi produksi nominal kecil yang disepakati.
- [ ] Diuji minimal pada dua ukuran layar HP dan koneksi representatif.
- [ ] API key dan token rahasia tidak muncul di bundle browser atau halaman publik.
- [ ] Gangguan WAHA, internet homeserver, dan webhook terlambat diuji.
- [ ] Backup dan satu percobaan restore selesai.
- [ ] Aa Iis/penjaga berhasil menjalankan simulasi pergantian sif dan penanganan order bermasalah.
- [ ] Keputusan terbuka yang menghambat produksi telah ditutup.

## 15. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Otomatisasi WA Web terputus/dibatasi | Notifikasi tidak sampai | Nomor khusus, monitoring, retry, dashboard cadangan; jangan menjanjikan bebas banned |
| Homeserver mati/listrik atau internet terganggu | Pengiriman tertunda | Proses persisten, health check, pemulihan; tutup online jika tidak ada pemantauan cadangan |
| Penjaga lupa memperbarui stok | Order lunas tidak dapat dipenuhi | Toggle sederhana, pengecekan rutin, prosedur refund |
| Salah memilih sif | Pesanan masuk ke orang yang tidak bertugas | Penanda penerima aktif jelas dan serah terima order |
| Pesanan terjadwal terlupakan | Terlambat disiapkan | Waktu ambil menonjol di WA/dashboard; tetap tanpa reminder sesuai keputusan |
| Estimasi tidak mencerminkan dapur | Pelanggan tetap menunggu | Penjaga mengubah estimasi dan menghubungi pelanggan ketika terlambat |
| Tautan privat tersebar | Detail pesanan terlihat pihak lain | Token acak, minimasi data, tidak tampil di log publik, kebijakan kedaluwarsa |
| Merchant belum aktif | Pembayaran produksi tertunda | Konfirmasi akun dan kanal sebelum menetapkan tanggal rilis |
| Target permintaan tidak tercapai | Manfaat belum terbukti | Evaluasi dua minggu: order selesai dan masukan pelanggan, bukan sekadar kunjungan |

## 16. Tahapan implementasi dan peluncuran

1. **Finalisasi operasional:** katalog/harga, penjaga, rekening/prosedur refund, merchant, aturan waktu pembayaran, lokasi hosting web/database.
2. **Fondasi:** model data, autentikasi admin, menu, keranjang, checkout dan aturan waktu.
3. **Pembayaran:** transaksi sandbox, verifikasi server, idempotensi, rekonsiliasi.
4. **WhatsApp:** WAHA homeserver, sesi persisten, pengamanan akses, tugas pengiriman/retry, sif aktif.
5. **Operasional:** riwayat privat, dashboard, estimasi, tutup/buka, refund manual, audit dasar.
6. **Uji penerimaan:** alur normal dan kegagalan pada bagian 14, latihan penjaga.
7. **Peluncuran terbatas:** transaksi produksi kecil dan pemantauan order pertama.
8. **Evaluasi:** tinjau minggu pertama; ukur target minggu kedua dan perbaiki hambatan.

Tidak ada tanggal rilis atau estimasi hari pengerjaan yang dikunci sebelum kesiapan merchant dan infrastruktur diketahui.

## 17. Hal yang masih perlu ditentukan

| ID | Keputusan terbuka | Penanggung jawab | Kapan diperlukan |
|---|---|---|---|
| TBD-01 | Daftar menu, kategori, harga, foto, opsi panas/dingin dan tambahan telur | Aa Iis + Bang Jan | Sebelum input katalog produksi |
| TBD-02 | Akun Midtrans siap atau belum, kanal aktif, tarif dan durasi kedaluwarsa yang sesuai pickup | Bang Jan + Aa Iis | Sebelum integrasi produksi |
| TBD-03 | Hosting web/API/database dan spesifikasi homeserver yang tersedia | Bang Jan | Sebelum deployment |
| TBD-04 | Nama subdomain, nomor pengirim, daftar nomor penjaga, kontak publik warung | Bang Jan + Aa Iis | Sebelum uji end-to-end |
| TBD-05 | Akun admin bersama atau akun per penjaga dengan hak sama | Bang Jan + Aa Iis | Sebelum uji operasional |
| TBD-06 | Batas refund, sebagian/seluruh order, tenggat, biaya transfer, serta kebijakan pembatalan pelanggan/no-show | Aa Iis | Sebelum menerima uang pelanggan |
| TBD-07 | Aturan final pembayaran terlambat, interval pilihan jam, estimasi di atas satu jam | Aa Iis + Bang Jan | Sebelum checkout selesai |
| TBD-08 | Retensi data, masa berlaku tautan privat, jadwal/lokasi backup | Bang Jan | Sebelum produksi |
| TBD-09 | Persetujuan definisi target rata-rata 21 order pada hari 8–14 | Aa Iis + Bang Jan | Sebelum evaluasi peluncuran |
| TBD-10 | SOP serah terima dan penutupan online saat WA serta pemantauan cadangan tidak tersedia | Aa Iis | Sebelum produksi |

## 18. Perubahan utama dari v1.0

| v1.0 | v2.0 |
|---|---|
| Makan di tempat atau dibungkus | Pickup saja |
| Nomor meja opsional | Dihapus |
| Pelanggan menekan kirim melalui wa.me | Sistem mengirim otomatis lewat WAHA + WEBJS |
| Penerima tunggal Aa Iis | Penerima mengikuti sif yang dipilih manual |
| Tidak ada waktu ambil yang terdefinisi | Secepatnya, estimasi awal 10 menit; pilih jam maksimal satu jam |
| Varian diarahkan ke catatan | Pilihan yang mengubah harga dibuat terstruktur |
| Dashboard auto-refresh Should | Must karena menjadi jalur cadangan operasional |
| Riwayat pelanggan di luar scope | Riwayat lokal tanpa login + tautan privat order |
| Biaya gateway belum ditentukan | Ditanggung warung |
| Infrastruktur dominan serverless | WAHA membutuhkan proses persisten pada homeserver |
| Refund disebut singkat | SOP manual dan pencatatan status dipisahkan |
| Ukuran minat belum konkret | Target 3 order selesai/hari pada minggu kedua |

## 19. Referensi teknis

Referensi berikut telah diperiksa dalam diskusi pada 21 Oktober 2026. Detail versi, keamanan, API, ketentuan, dan biaya harus diverifikasi kembali saat implementasi; tautan ini bukan jaminan kompatibilitas versi tertentu.

- [whatsapp-web.js — situs proyek](https://wwebjs.dev/): library Node.js yang berinteraksi melalui WhatsApp Web.
- [WAHA — engine WEBJS](https://waha.devlike.pro/docs/engines/webjs/): lapisan REST API/webhook, engine berbasis browser, serta contoh penyimpanan sesi persisten.

Konfigurasi Midtrans, pemetaan status, dan batas kanal pembayaran harus mengikuti dokumentasi resmi yang diperiksa saat integrasi. PRD ini tidak menetapkan tarif gateway atau syarat hosting gratis yang belum diverifikasi.
