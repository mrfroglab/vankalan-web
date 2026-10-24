'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoreSettings, getShifts } from '@/lib/store';
import { StoreSettings, Shift } from '@/types';
import {
  Utensils,
  Layers,
  Users,
  Settings,
  ArrowLeft,
  Wifi,
  WifiOff,
} from 'lucide-react';

export function AdminHeader() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const loadData = () => {
    setSettings(getStoreSettings());
    setShifts(getShifts());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, []);

  const activeShift =
    shifts.find((s) => s.id === settings?.recipientShiftId) ||
    shifts[0] || {
      name: 'Aa Iis',
      phone: '6281234500001',
    };

  const navLinks = [
    { href: '/admin/antrean', label: 'Antrean Dapur', icon: Layers },
    { href: '/admin/menu', label: 'Kelola Menu', icon: Utensils },
    { href: '/admin/sif', label: 'Penjaga & Sif', icon: Users },
    { href: '/admin/pengaturan', label: 'Pengaturan & WA', icon: Settings },
  ];

  return (
    <header className="space-y-4">
      {/* Top Operational Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e9e5df] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-11 h-11 rounded-full bg-[#f5f2ed] hover:bg-[#e9e5df] border border-[#e9e5df] flex items-center justify-center text-[#68645e] hover:text-[#242321] transition-colors shrink-0"
            title="Kembali ke Tampilan Pelanggan"
            aria-label="Kembali ke Tampilan Pelanggan"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center">
                <span className="bg-[#d94b3d] text-white font-black text-xs px-2 py-1 rounded-md tracking-wider mr-2 select-none">
                  PV
                </span>
                <h1 className="text-base sm:text-lg font-bold text-[#242321]">
                  Dapur Warmindo Putra Vangkalan
                </h1>
              </div>
              <span className="text-[10px] font-mono uppercase bg-[#f5f2ed] border border-[#e9e5df] px-2 py-0.5 rounded-md text-[#68645e]">
                DAPUR
              </span>
            </div>
            <p className="text-xs text-[#68645e] mt-1">
              Sif Bertugas: <strong className="text-[#242321] font-semibold">{activeShift.name}</strong> ({activeShift.phone})
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Toko Online Status */}
          <div
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 border transition-all ${
              settings?.open
                ? 'bg-[#e2edd8] border-[#c5dcba] text-[#1c4d25]'
                : 'bg-[#fde7e4] border-[#f7c5be] text-[#91251c]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.open ? 'bg-[#297838]' : 'bg-[#b64035]'
              }`}
            />
            <span>Toko Online: {settings?.open ? 'BUKA' : 'TUTUP'}</span>
          </div>

          {/* Status WAHA */}
          <div
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 border transition-all ${
              settings?.waConnected
                ? 'bg-[#f5f2ed] border-[#e9e5df] text-[#1c4d25]'
                : 'bg-[#fde7e4] border-[#f7c5be] text-[#91251c]'
            }`}
            title={
              settings?.waConnected
                ? 'WAHA WEBJS aktif'
                : 'Simulasi WAHA terputus (notifikasi masuk ke status FAILED)'
            }
          >
            {settings?.waConnected ? (
              <Wifi className="w-3.5 h-3.5 text-[#1c4d25]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#91251c]" />
            )}
            <span>
              Status WAHA: {settings?.waConnected ? 'Terhubung' : 'Terputus'}
            </span>
          </div>

          {/* Button Tampilan Pelanggan */}
          <Link
            href="/"
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Tampilan Pelanggan</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="flex items-center gap-2 overflow-x-auto pb-1"
        aria-label="Navigasi Internal Admin"
      >
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#242321] text-white shadow-xs'
                  : 'bg-white text-[#68645e] hover:text-[#242321] border border-[#e9e5df] hover:bg-[#f5f2ed]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
