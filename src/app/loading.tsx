import React from 'react';
import { MenuCardSkeleton } from '@/components/customer/MenuCardSkeleton';

export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-line space-y-3 animate-fade-in">
          <div className="h-7 w-64 bg-line rounded-full animate-shimmer" />
          <div className="h-4 w-48 bg-line/60 rounded-full animate-shimmer" />
        </div>

        <div className="space-y-3">
          <div className="h-12 w-full bg-line/40 rounded-2xl animate-shimmer" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-20 bg-line/50 rounded-full animate-shimmer" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
