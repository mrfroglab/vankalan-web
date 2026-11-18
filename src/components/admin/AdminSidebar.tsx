'use client';

import { formatPhone } from '@/lib/constants';
import { buttonClass } from '@/components/ui/Button';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Images, Layers, LogOut, Menu, Settings, Store, Users, Utensils, X, type LucideIcon } from 'lucide-react';
import { settingsService } from '@/services/settings';
import { apiRequest, isBackendConfigured } from '@/services/client';
import type { Shift, StoreSettings } from '@/types';

type Tone = 'ok' | 'warn' | 'bad' | 'muted';

const TONE: Record<Tone, { dot: string; pill: string }> = {
  ok: { dot: 'bg-success', pill: 'bg-success-soft text-success-ink' },
  warn: { dot: 'bg-rating', pill: 'bg-gold-soft text-gold-ink' },
  bad: { dot: 'bg-danger animate-pulse', pill: 'bg-danger-soft text-danger-ink' },
  muted: { dot: 'bg-faint', pill: 'bg-cream text-muted' },
};

type WaStatus =
  | { configured: false }
  | { configured: true; reachable: true; status: string; needsQr: boolean }
  | { configured: true; reachable: false; error: string };

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted mb-2.5 px-1">{children}</h3>
);

const Divider = () => <div className="border-t border-line-soft my-4" />;

/** Data operasional untuk sidebar: toko, sif bertugas, sesi WhatsApp, antrean galeri. */
function useAdminStatus() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [galleryPending, setGalleryPending] = useState<number | undefined>();
  const [offline, setOffline] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [sett, shfs] = await Promise.all([settingsService.getStoreSettings(), settingsService.getShifts()]);
      setSettings(sett);
      setShifts(shfs);
      setOffline(false);
    } catch (e) {
      console.warn('Gagal memuat settings/shifts di sidebar admin', e);
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    window.addEventListener('storage', loadSettings);
    window.addEventListener('pv_storage_update', loadSettings);
    return () => {
      window.removeEventListener('storage', loadSettings);
      window.removeEventListener('pv_storage_update', loadSettings);
    };
  }, [loadSettings]);

  useEffect(() => {
    if (!isBackendConfigured()) return;
    let cancelled = false;
    const check = async () => {
      loadSettings();
      const [w, g] = await Promise.allSettled([
        apiRequest<WaStatus>('/api/wa/status'),
        apiRequest<{ counts: { PENDING: number } }>('/api/gallery/admin?only=counts'),
      ]);
      if (cancelled) return;
      setWa(w.status === 'fulfilled' ? w.value : null);
      if (g.status === 'fulfilled') setGalleryPending(g.value.counts.PENDING);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loadSettings]);

  const store: { tone: Tone; value: string } = offline
    ? { tone: 'bad', value: 'Offline' }
    : !settings
    ? { tone: 'muted', value: '…' }
    : settings.open
      ? { tone: 'ok', value: 'Buka' }
      : { tone: 'bad', value: 'Tutup' };

  // Satu status WhatsApp: jeda manual dari Pengaturan menang, lalu kondisi sesi WAHA asli.
  const whatsapp: { tone: Tone; value: string } = offline
    ? { tone: 'bad', value: 'Offline' }
    : !settings
    ? { tone: 'muted', value: '…' }
    : !settings.waConnected
      ? { tone: 'warn', value: 'Dijeda' }
      : !wa || !wa.configured
        ? { tone: 'muted', value: wa ? 'Belum diatur' : '…' }
        : !wa.reachable
          ? { tone: 'bad', value: 'Offline' }
          : wa.needsQr
            ? { tone: 'bad', value: 'Scan QR' }
            : wa.status === 'WORKING'
              ? { tone: 'ok', value: 'Aktif' }
              : { tone: 'warn', value: wa.status === 'STARTING' ? 'Menyiapkan' : wa.status };

  const activeShift = shifts.find((s) => s.id === settings?.recipientShiftId) ?? shifts[0];

  return { store, whatsapp, activeShift, galleryPending };
}

function SidebarPanel({
  status,
  onNavigate,
  onClose,
}: {
  status: ReturnType<typeof useAdminStatus>;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const nav: NavItem[] = [
    { href: '/admin/antrean', label: 'Antrean Dapur', icon: Layers },
    { href: '/admin/menu', label: 'Kelola Menu', icon: Utensils },
    { href: '/admin/sif', label: 'Penjaga & Sif', icon: Users },
    { href: '/admin/galeri', label: 'Galeri', icon: Images, badge: status.galleryPending || undefined },
    { href: '/admin/pengaturan', label: 'Pengaturan & WA', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  };

  const statusRows = [
    { href: '/admin/pengaturan', label: 'Toko online', ...status.store },
    { href: '/admin/pengaturan#whatsapp', label: 'WhatsApp', ...status.whatsapp },
  ];

  return (
    <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-card">
      {/* Identitas */}
      <div className="flex items-center gap-2.5 px-1">
        <span className="bg-danger text-white font-black text-2xs px-2 py-1 rounded-full tracking-wider select-none shrink-0">
          PV
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-ink tracking-tight leading-tight">Dapur</p>
          <p className="text-2xs text-subtle leading-tight truncate">Warmindo Putra Vangkalan</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-muted hover:bg-canvas cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Divider />

      {/* Status */}
      <section aria-labelledby="admin-status-heading">
        <SectionTitle>
          <span id="admin-status-heading">Status</span>
        </SectionTitle>
        <div className="space-y-1">
          {statusRows.map((row) => (
            <Link
              key={row.label}
              href={row.href}
              onClick={onNavigate}
              role={row.tone === 'bad' ? 'alert' : undefined}
              className="w-full flex items-center justify-between px-3 py-2 rounded-full text-xs text-muted hover:bg-canvas/60 hover:text-ink transition-colors min-h-10"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full border border-line bg-white flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full ${TONE[row.tone].dot}`} />
                </span>
                {row.label}
              </span>
              <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${TONE[row.tone].pill}`}>
                {row.value}
              </span>
            </Link>
          ))}
        </div>

        {status.activeShift && (
          <Link
            href="/admin/sif"
            onClick={onNavigate}
            className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-surface-muted border border-line-soft hover:border-line-strong transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-gold/25 text-gold-ink text-xs font-bold flex items-center justify-center shrink-0">
              {status.activeShift.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted block">Sif bertugas</span>
              <span className="block text-xs font-semibold text-ink truncate">
                {status.activeShift.name}
                <span className="font-normal text-muted tabular-nums"> · {formatPhone(status.activeShift.phone)}</span>
              </span>
            </span>
          </Link>
        )}
      </section>

      <Divider />

      {/* Navigasi */}
      <nav aria-label="Navigasi admin">
        <SectionTitle>Menu Dapur</SectionTitle>
        <div className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-colors min-h-10 ${
                  active
                    ? 'bg-canvas text-ink font-semibold'
                    : 'text-muted hover:bg-canvas/60 hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      active ? 'bg-gold text-ink' : 'bg-white border border-line text-subtle'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className="text-2xs px-2 py-0.5 rounded-full bg-white border border-line text-subtle font-medium"
                    title={`${item.badge} menunggu moderasi`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <Divider />

      <div className="space-y-2">
        <Link
          href="/"
          className={buttonClass('gold', 'sm', 'w-full justify-center')}
        >
          <Store className="w-4 h-4" />
          Tampilan Pelanggan
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={buttonClass('outline', 'sm', 'w-full justify-center')}
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}

/**
 * Navigasi admin: sidebar menempel di desktop (gaya panel filter pelanggan),
 * bar ringkas + laci di layar kecil.
 */
export function AdminSidebar() {
  const status = useAdminStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const alert = status.whatsapp.tone === 'bad' || status.store.tone === 'bad';

  return (
    <>
      {/* Layar kecil: bar ringkas */}
      <div className="lg:hidden sticky top-3 z-30 bg-white/95 backdrop-blur border border-line rounded-2xl shadow-card px-3 py-2.5 flex items-center gap-2.5">
        <span className="bg-danger text-white font-black text-2xs px-2 py-1 rounded-full tracking-wider select-none shrink-0">
          PV
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink leading-tight truncate">Dapur Vangkalan</p>
          <p className="text-2xs text-subtle leading-tight truncate">Warmindo Putra Vangkalan</p>
        </div>
        <Link
          href="/admin/pengaturan#whatsapp"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-surface-muted border border-line-soft"
          aria-label={`Toko ${status.store.value}, WhatsApp ${status.whatsapp.value}`}
        >
          <span className={`w-2 h-2 rounded-full ${TONE[status.store.tone].dot}`} />
          <span className={`w-2 h-2 rounded-full ${TONE[status.whatsapp.tone].dot}`} />
          {alert && <span className="text-2xs font-semibold text-danger-ink">Cek</span>}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu admin"
          aria-expanded={open}
          className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-ink hover:bg-canvas cursor-pointer shrink-0"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] p-3 overflow-y-auto animate-fade-in">
            <SidebarPanel status={status} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop: sidebar menempel */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl">
        <SidebarPanel status={status} />
      </aside>
    </>
  );
}
