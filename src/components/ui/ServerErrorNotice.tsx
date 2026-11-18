'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Pemberitahuan server gagal dihubungi, dengan tombol coba lagi. */
export function ServerErrorNotice({
  title,
  message,
  onRetry,
  className = '',
}: {
  title: string;
  message: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-[#f7c5be] bg-[#fde7e4] text-[#91251c] ${className}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs leading-relaxed mt-0.5 text-[#7a2a22]">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[40px] px-4 rounded-full bg-white border border-[#f7c5be] text-xs font-bold text-[#91251c] hover:bg-[#fff5f3] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Coba lagi
        </button>
      )}
    </div>
  );
}
