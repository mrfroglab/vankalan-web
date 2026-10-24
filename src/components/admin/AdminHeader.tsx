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
  Power,
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

  const activeShift = shifts.find((s) => s.id === settings?.recipientShiftId) || shifts[0];

  const navLinks = [
    { href: '/admin/antrean', label: 'Antrean Dapur', icon: Layers },
    { href: '/admin/menu', label: 'Kelola Menu', icon: Utensils },
    { href: '/admin/sif', label: 'Penjaga & Sif', icon: Users },
    { href: '/admin/pengaturan', label: 'Pengaturan & WA', icon: Settings },
  ];

  return (
    <header className="space-y-4">
      {/* Top Banner Operasional */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border-line flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-paper hover:bg-neutral-100 border border-border-line flex items-center justify-center text-text-muted hover:text-ink transition-colors shrink-0"
            title="Buka Halaman Pelanggan"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-ink">
                Admin Warmindo Putra Vangkalan
              </h1>
              <span className="text-[10px] font-mono uppercase bg-neutral-100 border border-border-line px-2 py-0.5 rounded-md text-text-muted">
                DEMO
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Sif Bertugas: <strong className="text-ink">{activeShift?.name || 'Aa Iis'}</strong> ({activeShift?.phone || '-'})
            </p>
          </div>
        </div>

        {/* Status Indikator */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Toko Online */}
          <div
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border ${
              settings?.open
                ? 'bg-soft-green border-brand-green/30 text-brand-green'
                : 'bg-danger-red/10 border-danger-red/30 text-danger-red'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Pesanan Online {settings?.open ? 'BUKA' : 'TUTUP'}</span>
          </div>

          {/* Status WAHA */}
          <div
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border ${
              settings?.waConnected
                ? 'bg-neutral-50 border-border-line text-brand-green'
                : 'bg-danger-red/10 border-danger-red/30 text-danger-red'
            }`}
            title={
              settings?.waConnected
                ? 'WAHA WEBJS aktif'
                : 'Simulasi WAHA terputus (notifikasi masuk ke status FAILED)'
            }
          >
            {settings?.waConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span>WA: {settings?.waConnected ? 'Terhubung' : 'Terputus'}</span>
          </div>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-paper hover:bg-neutral-100 border border-border-line text-ink font-semibold transition-colors"
          >
            Tampilan Pelanggan
          </Link>
        </div>
      </div>

      {/* Tab Navigasi Admin */}
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
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-white text-text-muted hover:text-ink border border-border-line hover:bg-neutral-50'
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
