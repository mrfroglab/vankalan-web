import React from 'react';
import Link from 'next/link';
import { Clock, Code2, ArrowUpRight, Mail } from 'lucide-react';
import { FaInstagram, FaWhatsapp, FaTiktok, FaGithub } from 'react-icons/fa6';

export function FoodlyFooter() {
  const popularMenus = [
    { name: 'Indomie Goreng Spesial', href: '/?search=Indomie+Goreng' },
    { name: 'Indomie Kuah Soto', href: '/?search=Indomie+Kuah' },
    { name: 'Nasi Telur Warmindo', href: '/?search=Nasi+Telur' },
    { name: 'Roti Bakar Cokelat', href: '/?search=Roti+Bakar' },
    { name: 'Es Teh Manis Segar', href: '/?search=Es+Teh' },
  ];

  const serviceHighlights = [
    'Ambil Sendiri (Pickup)',
    'Estimasi Persiapan Cepat',
    'Simulasi Pembayaran Midtrans',
    'Integrasi WhatsApp Notifikasi',
  ];

  const adminLinks = [
    { label: 'Dashboard Dapur', href: '/admin/antrean' },
    { label: 'Kelola Menu', href: '/admin/menu' },
    { label: 'Manajemen Sif', href: '/admin/sif' },
    { label: 'Pengaturan Toko', href: '/admin/pengaturan' },
  ];

  return (
    <footer className="bg-[#f1ede7] text-[#242321] pt-12 pb-8 border-t border-[#e9e5df]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Tata Letak 4 Kolom Khas Foodly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Kolom 1: Profil Brand & Jam Operasional */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#d94b3d] text-white font-black text-xs px-2.5 py-1 rounded-full tracking-wider select-none shrink-0">
                PV
              </span>
              <span className="text-base font-bold text-[#242321] tracking-tight">
                Warmindo Putra Vangkalan
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#68645e] leading-relaxed">
              Pesan menu warmindo favoritmu tanpa antre. Nikmati mi instan racikan
              spesial, nasi telur, camilan, dan minuman segar.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 bg-white/90 border border-[#e9e5df] text-xs text-[#242321] font-medium px-3.5 py-1.5 rounded-full shadow-xs">
              <Clock className="w-3.5 h-3.5 text-[#77736d] shrink-0" aria-hidden="true" />
              <span>Buka Setiap Hari: 08:00 - 02:00 WIB</span>
            </div>
          </div>

          {/* Kolom 2: Menu Populer */}
          <div>
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321] mb-3">
              Menu Populer
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#68645e]">
              {popularMenus.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-[#242321] hover:underline underline-offset-4 transition-colors inline-block py-0.5"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Layanan & Informasi */}
          <div>
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321] mb-3">
              Layanan & Informasi
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#68645e]">
              {serviceHighlights.map((service) => (
                <li key={service} className="flex items-center gap-2 py-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#f5c943] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 4: Area Pengelola */}
          <div>
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321] mb-3">
              Area Pengelola
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#68645e]">
              {adminLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-[#242321] hover:underline underline-offset-4 transition-colors inline-block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Banner Promosi Diri & Developer Credit */}
        <div className="mt-10 pt-8 border-t border-[#e9e5df]">
          <div className="bg-white border border-[#e9e5df] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#918c84] bg-[#f5f2ed] border border-[#e9e5df] px-2.5 py-0.5 rounded-full">
                  <Code2 className="w-3.5 h-3.5 text-[#d94b3d]" />
                  <span>Pengembang Web</span>
                </span>
                <span className="text-xs font-semibold text-[#1c4d25] bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  Terbuka untuk Freelance & Kolaborasi
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#242321] tracking-tight">
                Januarsyah Akbar (Bang Jan)
              </h3>

              <p className="text-xs sm:text-sm text-[#68645e] leading-relaxed">
                Mahasiswa Teknologi Rekayasa Perangkat Lunak (TRPL) SV UGM. Mengembangkan aplikasi web interaktif, sistem operasional dapur, dan katalog belanja digital responsif. Butuh website untuk bisnismu atau ingin berkolaborasi proyek?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
              <a
                href="https://github.com/januarsyah901"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-full bg-[#242321] hover:bg-black text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <FaGithub className="w-4 h-4" />
                <span>Portofolio & GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href="https://www.instagram.com/hallojanuu/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-3.5 py-2 rounded-full bg-white hover:bg-[#fbf9f5] text-[#242321] border border-[#e9e5df] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <FaInstagram className="w-3.5 h-3.5 text-[#e1306c]" />
                <span>@hallojanuu</span>
              </a>

              <a
                href="https://www.tiktok.com/@bangjanu09"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-3.5 py-2 rounded-full bg-white hover:bg-[#fbf9f5] text-[#242321] border border-[#e9e5df] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <FaTiktok className="w-3 h-3 text-[#242321]" />
                <span>@bangjanu09</span>
              </a>

              <a
                href="mailto:januarsyahakbar791@gmail.com"
                className="min-h-[42px] px-3.5 py-2 rounded-full bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Kirim email ke Januarsyah Akbar"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Hubungi Saya</span>
              </a>
            </div>
          </div>
        </div>

        {/* Baris Bawah: Hak Cipta dan Tombol Media Sosial */}
        <div className="border-t border-[#eeeae4] mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#918c84]">
          <p>
            © 2026 Warmindo Putra Vangkalan. Dibuat dan dikembangkan oleh{' '}
            <a
              href="https://github.com/januarsyah901"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#242321] hover:underline underline-offset-2"
            >
              Januarsyah Akbar
            </a>
            .
          </p>

          <div
            className="flex items-center gap-2"
            aria-label="Tautan Media Sosial Warmindo Putra Vangkalan"
          >
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kunjungi Instagram Warmindo Putra Vangkalan"
              className="w-11 h-11 rounded-full bg-white border border-[#e9e5df] text-[#77736d] hover:text-[#242321] hover:border-[#f5c943] hover:bg-[#f5c943]/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaInstagram className="w-4 h-4" aria-hidden="true" />
            </a>

            <a
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi WhatsApp Warmindo Putra Vangkalan"
              className="w-11 h-11 rounded-full bg-white border border-[#e9e5df] text-[#77736d] hover:text-[#242321] hover:border-[#f5c943] hover:bg-[#f5c943]/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaWhatsapp className="w-4 h-4" aria-hidden="true" />
            </a>

            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kunjungi TikTok Warmindo Putra Vangkalan"
              className="w-11 h-11 rounded-full bg-white border border-[#e9e5df] text-[#77736d] hover:text-[#242321] hover:border-[#f5c943] hover:bg-[#f5c943]/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaTiktok className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
