import React from 'react';
import { buttonClass } from '@/components/ui/Button';
import Link from 'next/link';
import { Clock, ArrowUpRight, Mail } from 'lucide-react';
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
    'Bayar Online (QRIS, E-Wallet, Transfer)',
    'Pesanan Langsung Masuk ke Dapur',
  ];

  const pageLinks = [
    { label: 'Menu Lengkap', href: '/' },
    { label: 'Galeri Kenangan', href: '/galeri' },
    { label: 'Riwayat Pesanan', href: '/history' },
  ];

  return (
    <footer className="bg-cream text-ink pt-12 pb-8 border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Tata Letak 4 Kolom Khas Foodly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Kolom 1: Profil Brand & Jam Operasional */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-danger text-white font-black text-xs px-2.5 py-1 rounded-full tracking-wider select-none shrink-0">
                PV
              </span>
              <span className="text-base font-bold text-ink tracking-tight">
                Warmindo Putra Vangkalan
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Pesan menu warmindo favoritmu tanpa antre. Nikmati mi instan racikan
              spesial, nasi telur, camilan, dan minuman segar.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 bg-white/90 border border-line text-xs text-ink font-medium px-3.5 py-1.5 rounded-full shadow-xs">
              <Clock className="w-3.5 h-3.5 text-icon shrink-0" aria-hidden="true" />
              <span>Buka Setiap Hari: 08:00 - 02:00 WIB</span>
            </div>
          </div>

          {/* Kolom 2: Menu Populer */}
          <div>
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted mb-3">
              Menu Populer
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted">
              {popularMenus.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-ink hover:underline underline-offset-4 transition-colors inline-block py-0.5"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Layanan & Informasi */}
          <div>
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted mb-3">
              Layanan & Informasi
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted">
              {serviceHighlights.map((service) => (
                <li key={service} className="flex items-center gap-2 py-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"
                    aria-hidden="true"
                  />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 4: Jelajahi */}
          <div>
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted mb-3">
              Jelajahi
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-ink hover:underline underline-offset-4 transition-colors inline-block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Banner Promosi Diri & Developer Credit */}
        <div className="mt-10 pt-8 border-t border-line">
          <div className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight">
                Januarsyah Akbar (Bang Jan)
              </h3>

              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Mahasiswa Teknologi Rekayasa Perangkat Lunak (TRPL) SV UGM. Mengembangkan aplikasi web interaktif, sistem operasional dapur, dan katalog belanja digital responsif. Butuh website untuk bisnismu atau ingin berkolaborasi proyek?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
              <a
                href="https://github.com/januarsyah901"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('dark', 'sm')}
              >
                <FaGithub className="w-4 h-4" />
                <span>Portofolio & GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href="https://www.instagram.com/hallojanuu/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('outline', 'sm')}
              >
                <FaInstagram className="w-3.5 h-3.5 text-[#e1306c]" />
                <span>@hallojanuu</span>
              </a>

              <a
                href="https://www.tiktok.com/@bangjanu09"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('outline', 'sm')}
              >
                <FaTiktok className="w-3 h-3 text-ink" />
                <span>@bangjanu09</span>
              </a>

              <a
                href="mailto:januarsyahakbar791@gmail.com"
                className={buttonClass('gold', 'sm')}
                title="Kirim email ke Januarsyah Akbar"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Hubungi Saya</span>
              </a>
            </div>
          </div>
        </div>

        {/* Baris Bawah: Hak Cipta dan Tombol Media Sosial */}
        <div className="border-t border-line-soft mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-subtle">
          <p>
            © 2026 Warmindo Putra Vangkalan. Dibuat dan dikembangkan oleh{' '}
            <a
              href="https://github.com/januarsyah901"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink hover:underline underline-offset-2"
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
              className="w-11 h-11 rounded-full bg-white border border-line text-icon hover:text-ink hover:border-gold hover:bg-gold/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaInstagram className="w-4 h-4" aria-hidden="true" />
            </a>

            <a
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi WhatsApp Warmindo Putra Vangkalan"
              className="w-11 h-11 rounded-full bg-white border border-line text-icon hover:text-ink hover:border-gold hover:bg-gold/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaWhatsapp className="w-4 h-4" aria-hidden="true" />
            </a>

            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kunjungi TikTok Warmindo Putra Vangkalan"
              className="w-11 h-11 rounded-full bg-white border border-line text-icon hover:text-ink hover:border-gold hover:bg-gold/15 flex items-center justify-center transition-colors shadow-xs"
            >
              <FaTiktok className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
