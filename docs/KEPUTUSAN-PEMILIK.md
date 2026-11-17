# Keputusan yang Perlu Diambil Pemilik Warung

Untuk dibahas bersama pemilik Warmindo Putra Vangkalan sebelum pemesanan online dibuka. Setiap poin punya
**rekomendasi** yang sudah dipasang sebagai pengaturan awal; cukup jawab "setuju" atau tulis perubahannya. Kode TBD
merujuk ke `OPERASIONAL.md` bagian 8.

---

### 1. Menu, harga, dan foto (TBD-01)
Menu di aplikasi saat ini masih contoh.
- **Rekomendasi:** pemilik menyerahkan daftar menu final (nama, harga, ada pilihan telur/panas-dingin atau tidak), lalu
  diinput lewat dashboard admin. Foto boleh menyusul; tanpa foto aplikasi menampilkan ilustrasi.
- Jawaban: ☐ setuju  ☐ ubah: ______________________

### 2. Pembayaran Midtrans (TBD-02)
- **Akun atas nama siapa?** Rekomendasi: **atas nama pemilik** (KTP + rekening pemilik), karena uang cair ke rekening itu.
  Pilihan "usaha tanpa badan usaha" saat daftar.
- **Metode bayar:** rekomendasi **QRIS saja**. Biaya VA sekitar Rp4.000 per transaksi, terlalu mahal untuk pesanan
  Rp15–50 ribu; QRIS sekitar 0,7% (≈ Rp175 untuk Rp25 ribu). Bisa dicek apakah warung masuk tarif usaha mikro.
- **Batas waktu bayar:** rekomendasi **15 menit**; lewat dari itu pesanan batal otomatis dan tidak masuk dapur.
- Jawaban: akun atas nama ________  metode ☐ QRIS saja ☐ QRIS + ______  batas ☐ 15 menit ☐ ____ menit

### 3. Nomor WhatsApp pengirim notifikasi
Sistem mengirim pesanan baru ke WA penjaga lewat satu nomor pengirim.
- **Rekomendasi:** pakai **nomor khusus warung** (bukan nomor pribadi), HP-nya tetap tersambung internet. Nomor ini
  di-scan QR sekali di server. Catatan: ini bukan WhatsApp resmi untuk bisnis; untuk volume kecil umumnya aman.
- Jawaban: nomor pengirim ______________  pemegang HP ______________

### 4. Penjaga dan sif
- Siapa saja penjaga, jam sifnya, dan **nomor WA masing-masing** (penerima notifikasi)?
- Jawaban: ___________________________________________

### 5. Login admin: satu kata sandi bersama atau per penjaga? (TBD-05)
- **Rekomendasi:** **satu kata sandi bersama** dulu (sudah jadi). Ganti kata sandi bila ada penjaga berhenti.
  Login per penjaga bisa dibuat nanti bila perlu tahu siapa yang mengubah apa.
- Jawaban: ☐ bersama  ☐ per penjaga

### 6. Refund dan pelanggan tidak datang (TBD-06)
Refund dilakukan manual (transfer balik), lalu dicatat di dashboard.
- **Rekomendasi:**
  - Bahan habis / warung batal: **refund penuh**, paling lambat 1×24 jam.
  - Pelanggan batal sebelum dimasak: refund penuh. Sudah dimasak: tidak refund.
  - Pelanggan tidak datang: makanan disimpan sampai warung tutup hari itu, tanpa refund.
- Jawaban: ☐ setuju  ☐ ubah: ______________________

### 7. Pembayaran terlambat dan jam ambil (TBD-07)
Bila pelanggan baru membayar mendekati/lewat jam ambil yang dipilih, pesanan ditandai **"Perlu konfirmasi waktu"**.
- **Rekomendasi:** penjaga menghubungi pelanggan lewat WA untuk sepakat jam baru. Jam ambil terjadwal maksimal 1 jam ke
  depan (sudah begitu).
- Jawaban: ☐ setuju  ☐ ubah: ______________________

### 8. Berapa lama data pelanggan disimpan (TBD-08)
- **Rekomendasi (sudah terpasang):** tautan lacak pesanan berlaku 30 hari; nama/nomor WA pelanggan dihapus 90 hari
  setelah pesanan selesai (total & item tetap untuk pembukuan); pesanan yang tidak pernah dibayar dihapus setelah 7 hari;
  database dicadangkan tiap hari, 14 cadangan terakhir disimpan.
- Jawaban: ☐ setuju  ☐ ubah: ______________________

### 9. Kalau WhatsApp notifikasi mati (TBD-10)
Pesanan tetap masuk dashboard walau WA gagal.
- **Rekomendasi:** penjaga **selalu membuka dashboard antrean** di HP/tablet selama jam buka sebagai cadangan. Bila WA
  mati dan tidak ada yang bisa memantau dashboard, **tutup pemesanan online** lewat tombol Toko Online di admin.
- Jawaban: ☐ setuju  ☐ ubah: ______________________

### 10. Domain
Alamat situs pemesanan yang dibagikan ke pelanggan.
- Pilihan yang sudah tersedia: `vankalan.hallojanu.me` atau `vankalan.hallojanu.xyz`; bisa juga domain sendiri.
- Jawaban: ______________________

---

Disetujui oleh: ______________________  Tanggal: ____________
