# Naskah Simulasi Sif dan Order Bermasalah

Latihan satu kali bersama Aa Iis (dan penjaga lain) sebelum rilis, ±45 menit. Jalankan di lingkungan **sandbox**
(Midtrans sandbox, tidak ada uang sungguhan) setelah cutover (`OPERASIONAL.md` bagian 10). Siapkan: HP penjaga
dengan WA penerima, HP/tablet untuk dashboard `/admin`, satu HP lain sebagai "pelanggan".

Centang setiap langkah; catat yang membingungkan di kolom catatan. Kebingungan = bahan perbaikan aplikasi atau SOP.

## A. Alur normal (sif Aa Iis)
| # | Langkah | Yang harus terjadi | ✓ | Catatan |
|---|---|---|---|---|
| 1 | Penjaga login `/admin`, pilih sif **Aa Iis** aktif | Header menampilkan sif aktif, WA "terhubung" | ☐ | |
| 2 | "Pelanggan" pesan 2 menu, bayar QRIS sandbox (simulator Midtrans) | Halaman order jadi **Lunas** | ☐ | |
| 3 | Cek WA Aa Iis | Pesan "PESANAN ONLINE" dengan nomor order, item, jam ambil | ☐ | |
| 4 | Ubah status Diterima → Dimasak → Siap | Halaman order pelanggan ikut berubah | ☐ | |
| 5 | Hubungi pelanggan lewat WA (manual), lalu **Selesai** | Order hilang dari antrean aktif | ☐ | |

## B. Pergantian sif
| # | Langkah | Yang harus terjadi | ✓ | Catatan |
|---|---|---|---|---|
| 6 | Buat 1 order lunas, **jangan** diproses | Masuk antrean, WA ke Aa Iis | ☐ | |
| 7 | Aktifkan sif **Penjaga Malam** | Muncul pilihan *Kirim Sekarang / Nanti* untuk order yang belum selesai | ☐ | |
| 8 | Pilih **Kirim Sekarang** | WA Penjaga Malam menerima pesan bertanda **[KIRIM ULANG]** | ☐ | |
| 9 | Order baru berikutnya | WA hanya ke Penjaga Malam | ☐ | |

## C. Order bermasalah
| # | Skenario | Cara memicu | Yang harus dilakukan penjaga | ✓ | Catatan |
|---|---|---|---|---|---|
| 10 | **WA mati** | Pengelola menghentikan WAHA (`docker stop vankalan-waha`), lalu buat order lunas | Order tetap muncul di dashboard dengan badge **WA Gagal**; proses dari dashboard. Setelah WAHA hidup lagi (`docker start vankalan-waha`), tekan **Kirim Ulang** | ☐ | |
| 11 | **Bahan habis** | Order lunas, anggap mi habis | Hubungi pelanggan, **Batalkan** dengan alasan → refund PENDING muncul; catat refund setelah "transfer" | ☐ | |
| 12 | **Bayar terlambat** | Pilih jam ambil terdekat, bayar menjelang/lewat jam itu | Badge **Perlu konfirmasi waktu**; hubungi pelanggan untuk jam baru | ☐ | |
| 13 | **Pembayaran kedaluwarsa** | Buat order, jangan bayar sampai batas waktu | Order tidak pernah masuk dapur; tidak perlu tindakan | ☐ | |
| 14 | **Toko tutup** | Matikan *Toko Online* di admin | Pelanggan tidak bisa checkout; nyalakan lagi setelahnya | ☐ | |
| 15 | **Pelanggan tidak datang** | Order Siap tapi tidak diambil | Ikuti kebijakan no-show (`KEPUTUSAN-PEMILIK.md` poin 6) | ☐ | |

## D. Penutup
- ☐ Penjaga tahu kata sandi admin dan cara login di HP sendiri.
- ☐ Penjaga tahu harus memantau dashboard bila WA bermasalah.
- ☐ Semua catatan kebingungan dikirim ke pengembang.

Tanggal simulasi: ____________  Peserta: ______________________
