import React from 'react';

export function MenuCardSkeleton() {
  return (
    <div className="bg-white border border-border-line rounded-2xl overflow-hidden">
      <div className="w-full h-36 sm:h-40 bg-border-line animate-shimmer" />
      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="h-4 w-3/4 bg-border-line rounded-lg animate-shimmer" />
        <div className="h-3 w-full bg-border-line/60 rounded-lg animate-shimmer" />
        <div className="h-3 w-2/3 bg-border-line/60 rounded-lg animate-shimmer" />
      </div>
      <div className="p-3.5 sm:p-4 pt-0 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-2.5 w-12 bg-border-line/50 rounded animate-shimmer" />
          <div className="h-4 w-16 bg-border-line rounded animate-shimmer" />
        </div>
        <div className="w-11 h-11 bg-border-line/50 rounded-xl animate-shimmer" />
      </div>
    </div>
  );
}
