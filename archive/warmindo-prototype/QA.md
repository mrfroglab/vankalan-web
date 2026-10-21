# Checklist QA manual

## Tampilan

- [ ] Buka pada lebar 390 px: navigasi terbaca, kartu menu dua kolom, tombol keranjang melayang tidak menutupi konten terakhir.
- [ ] Buka pada lebar 768 px dan 1440 px: grid tidak meluber, sidebar/cart tampil sesuai breakpoint.
- [ ] Tabel admin dapat digulir horizontal di HP tanpa membuat seluruh halaman meluber.
- [ ] Modal tidak melampaui tinggi layar dan kontennya dapat digulir.
- [ ] Navigasi keyboard: fokus terlihat, Escape menutup modal, Tab tetap di dalam modal.

## Pelanggan

- [ ] Cari menu, ganti kategori, dan coba hasil pencarian kosong.
- [ ] Menu habis tidak bisa dipilih.
- [ ] Tambah dua baris menu dengan pilihan/catatan berbeda; total akurat.
- [ ] Refresh halaman: keranjang tetap tersedia.
- [ ] Nomor WA tidak valid ditolak; format 08 dinormalisasi ke 62.
- [ ] Waktu ambil tidak dapat dipilih kurang dari estimasi atau lebih dari satu jam.
- [ ] Checkout berhasil membuka modal simulasi pembayaran.
- [ ] Hasil sukses/gagal/kedaluwarsa menghasilkan halaman order yang tepat.
- [ ] Lunas mengosongkan keranjang; gagal mempertahankannya.
- [ ] Riwayat dan tautan order bekerja pada browser yang sama.

## Admin

- [ ] Masuk demo dan logout berjalan.
- [ ] Muat contoh order satu kali; klik lagi tidak menggandakan.
- [ ] Pencarian/filter order dan detail berfungsi.
- [ ] Status diproses/diambil diperbarui di pelanggan.
- [ ] Pembatalan tidak mengubah fakta pembayaran lunas; refund tetap terpisah.
- [ ] Tambah/edit/hapus menu, foto, kategori, urutan, dan ketersediaan.
- [ ] Kategori berisi menu tidak boleh dihapus sebelum dipindahkan.
- [ ] Tambah/edit penjaga dan pindahkan sif aktif.
- [ ] Pemesanan online tutup memblokir checkout.
- [ ] Simulasi koneksi WA putus tidak menghilangkan order lunas.
- [ ] Pulihkan koneksi lalu kirim ulang demo ke sif aktif.
- [ ] Reset meminta konfirmasi dan mengembalikan katalog awal.

## Status verifikasi saat penyerahan

- Lulus: pemeriksaan sintaks JavaScript.
- Lulus: 8 pengujian otomatis logic dan smoke rendering HTML.
- Belum dilakukan: inspeksi visual/browser end-to-end. Daftar di atas disertakan untuk pengujian di perangkat pengguna.
