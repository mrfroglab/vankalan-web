'use client';

import { inputClass } from '@/components/ui/styles';
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
    <div className="bg-canvas min-h-screen flex items-center justify-center px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-2xl border border-line shadow-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <span className="bg-danger text-white font-black text-xs px-2.5 py-1 rounded-full tracking-wider select-none">
            PV
          </span>
          <h1 className="text-base font-bold text-ink">Masuk Dapur Admin</h1>
        </div>

        {configured === false && (
          <p role="alert" className="text-xs p-3 rounded-2xl bg-danger-soft text-danger-ink font-semibold">
            Login admin belum dikonfigurasi di server (ADMIN_PASSWORD dan SESSION_SECRET).
          </p>
        )}

        <label className="block text-xs font-semibold text-ink" htmlFor="admin-password">
          Kata sandi
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </label>

        {error && (
          <p role="alert" className="text-xs font-semibold text-danger-ink">
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
