'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { settingsService } from '@/services/settings';
import { apiRequest, isBackendConfigured } from '@/services/client';
import { StoreSettings, Shift } from '@/types';
import {
  Utensils,
  Layers,
  Users,
  Settings,
  LogOut,
  Store,
  ChevronRight,
  Images,
} from 'lucide-react';

type Tone = 'ok' | 'warn' | 'bad' | 'muted';

const TONES: Record<Tone, { chip: string; dot: string }> = {
  ok: { chip: 'bg-[#eaf3e3] text-[#1c4d25] hover:bg-[#dfecd5]', dot: 'bg-[#2f8a42]' },
  warn: { chip: 'bg-[#fdf3d6] text-[#7a5410] hover:bg-[#faebbf]', dot: 'bg-[#d9a21b]' },
  bad: { chip: 'bg-[#fde7e4] text-[#91251c] hover:bg-[#fbd9d4]', dot: 'bg-[#d94b3d] animate-pulse' },
  muted: { chip: 'bg-[#f1ede7] text-[#68645e] hover:bg-[#e9e5df]', dot: 'bg-[#b8b2a9]' },
};

function StatusChip({
  href,
  tone,
  label,
  short,
  alert,
}: {
  href: string;
  tone: Tone;
  label: string;
  short?: string;
  alert?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      role={alert ? 'alert' : undefined}
      className={`group h-8 pl-2.5 pr-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-colors ${t.chip}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} aria-hidden="true" />
      {short ? (
        <>
          <span className="min-[420px]:hidden">{short}</span>
          <span className="hidden min-[420px]:inline">{label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
      <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 transition-opacity" aria-hidden="true" />
    </Link>
  );
}

/** 6281234500001 -> 0812-3450-0001 (tampilan saja). */
function formatPhone(phone: string): string {
  const local = phone.replace(/\D/g, '').replace(/^62/, '0');
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  // Kondisi sesi WhatsApp sebenarnya di WAHA (FR-36); null = tidak diketahui/tidak relevan.
  const [waSession, setWaSession] = useState<{ ok: boolean; label: string } | null>(null);

  const loadData = async () => {
    try {
      const [sett, shfs] = await Promise.all([
        settingsService.getStoreSettings(),
        settingsService.getShifts(),
      ]);
      setSettings(sett);
      setShifts(shfs);
    } catch (e) {
      console.warn('Gagal memuat settings/shifts di AdminHeader', e);
    }
  };

  useEffect(() => {
    if (!isBackendConfigured()) return;
    let cancelled = false;
    const check = async () => {
      try {
        const s = await apiRequest<
          | { configured: false }
          | { configured: true; reachable: true; status: string; needsQr: boolean }
          | { configured: true; reachable: false; error: string }
        >('/api/wa/status');
        if (cancelled || !s.configured) return;
        if (!s.reachable) setWaSession({ ok: false, label: 'WAHA tidak terjangkau' });
        else if (s.needsQr) setWaSession({ ok: false, label: 'WhatsApp perlu scan QR' });
        else setWaSession({ ok: s.status === 'WORKING', label: s.status === 'WORKING' ? 'Sesi WA aktif' : `Sesi WA: ${s.status}` });
      } catch {
        if (!cancelled) setWaSession(null);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  };

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
    { href: '/admin/galeri', label: 'Galeri', icon: Images },
    { href: '/admin/pengaturan', label: 'Pengaturan & WA', icon: Settings },
  ];

  // Satu status WhatsApp: jeda manual dari Pengaturan menang, lalu kondisi sesi WAHA asli.
  const wa: { tone: Tone; label: string; short?: string } = !settings
    ? { tone: 'muted', label: 'WhatsApp…' }
    : !settings.waConnected
      ? { tone: 'warn', label: 'WhatsApp dijeda', short: 'WA dijeda' }
      : waSession
        ? {
            tone: waSession.ok ? 'ok' : 'bad',
            label: waSession.ok ? 'WhatsApp aktif' : waSession.label,
            short: waSession.ok ? 'WA aktif' : waSession.label.replace('WhatsApp', 'WA'),
          }
        : { tone: 'muted', label: 'WhatsApp' };

  return (
    <header className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#e9e5df] shadow-card">
        {/* Identitas + aksi */}
        <div className="flex items-center gap-3 p-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-[#d94b3d] text-white font-black text-[11px] px-2 py-0.5 rounded-full tracking-wider select-none shrink-0">
                PV
              </span>
              <h1 className="text-[15px] sm:text-lg font-bold text-[#242321] tracking-tight truncate">
                <span className="sm:hidden">Dapur Vangkalan</span>
                <span className="hidden sm:inline">Dapur Warmindo Putra Vangkalan</span>
              </h1>
            </div>
            <p className="text-xs text-[#68645e] mt-0.5 truncate">
              Sif bertugas <span className="text-[#242321] font-semibold">{activeShift.name}</span>
              <span className="hidden sm:inline">
                <span className="mx-1.5 text-[#c9c3ba]">·</span>
                <span className="tabular-nums">{formatPhone(activeShift.phone)}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="h-10 px-3 sm:px-4 rounded-full bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] text-xs font-bold transition-colors flex items-center gap-1.5"
              aria-label="Tampilan Pelanggan"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Tampilan Pelanggan</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 w-10 sm:w-auto sm:px-4 rounded-full border border-[#e9e5df] hover:bg-[#f5f2ed] text-[#68645e] hover:text-[#242321] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              aria-label="Keluar dari admin"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Status operasional */}
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-t border-[#f0ece6] bg-[#fcfbf8] rounded-b-2xl">
          <StatusChip
            href="/admin/pengaturan"
            tone={!settings ? 'muted' : settings.open ? 'ok' : 'bad'}
            label={!settings ? 'Toko…' : settings.open ? 'Toko buka' : 'Toko tutup'}
          />
          <StatusChip
            href="/admin/pengaturan#whatsapp"
            tone={wa.tone}
            label={wa.label}
            short={wa.short}
            alert={wa.tone === 'bad'}
          />
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
