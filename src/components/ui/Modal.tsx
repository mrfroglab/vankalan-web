'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  asBottomSheetOnMobile?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  asBottomSheetOnMobile = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full max-w-lg bg-paper border border-border-line shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden ${
          asBottomSheetOnMobile
            ? 'rounded-t-3xl sm:rounded-2xl'
            : 'rounded-2xl m-4'
        }`}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-line shrink-0 bg-white/80">
          <h2 id="modal-title" className="text-base sm:text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela dialog"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-soft-green transition-colors text-text-muted hover:text-ink cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
