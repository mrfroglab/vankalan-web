'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { safeNextPath } from '@/lib/safeNext';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s: { configured: boolean; authenticated: boolean }) => {
        setConfigured(s.configured);
        if (s.authenticated) router.replace(safeNextPath(params.get('next')));
      })
      .catch(() => setConfigured(null));
  }, [router, params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(safeNextPath(params.get('next')));
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Gagal masuk. Coba lagi.');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f5f2ed] min-h-screen flex items-center justify-center px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-2xl border border-[#e9e5df] shadow-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <span className="bg-[#d94b3d] text-white font-black text-xs px-2.5 py-1 rounded-full tracking-wider select-none">
            PV
          </span>
          <h1 className="text-base font-bold text-[#242321]">Masuk Dapur Admin</h1>
        </div>

        {configured === false && (
          <p role="alert" className="text-xs p-3 rounded-2xl bg-[#fde7e4] text-[#91251c] font-semibold">
            Login admin belum dikonfigurasi di server (ADMIN_PASSWORD dan SESSION_SECRET).
          </p>
        )}

        <label className="block text-xs font-semibold text-[#68645e]" htmlFor="admin-password">
          Kata sandi
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] px-4 rounded-full border border-[#e9e5df] bg-[#f5f2ed] text-sm text-[#242321] focus:outline-none focus:ring-2 focus:ring-[#297838]"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs font-semibold text-[#91251c]">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth isLoading={submitting} disabled={configured === false}>
          <Lock className="w-4 h-4" />
          Masuk
        </Button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
