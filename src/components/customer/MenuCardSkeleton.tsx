import React from 'react';

export function MenuCardSkeleton() {
  return (
    <div className="bg-white border border-[#e9e5df] rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between select-none">
      <div>
        {/* Kontainer Gambar Skeleton */}
        <div className="relative w-full h-32 sm:h-40 bg-[#fbf9f5] rounded-xl overflow-hidden mb-2 sm:mb-2.5 border border-[#eeeae4]/60 animate-shimmer">
          <div className="absolute top-2 left-2 w-12 sm:w-14 h-4 bg-white/80 rounded-full" />
          <div className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80" />
        </div>

        {/* Placeholder Detail */}
        <div className="space-y-1.5">
          <div className="h-3.5 sm:h-4 w-3/4 bg-[#eeeae4] rounded-full animate-shimmer" />
          <div className="h-2.5 sm:h-3 w-full bg-[#eeeae4]/60 rounded-full animate-shimmer" />
          <div className="h-2.5 sm:h-3 w-2/3 bg-[#eeeae4]/60 rounded-full animate-shimmer" />

          {/* Baris Metadata Rating & Waktu */}
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 pt-1.5 border-t border-[#eeeae4]">
            <div className="h-2.5 sm:h-3 w-12 sm:w-16 bg-[#eeeae4] rounded-full animate-shimmer" />
            <div className="h-2.5 sm:h-3 w-8 sm:w-10 bg-[#eeeae4] rounded-full animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Baris Bawah: Harga & Tombol Bulat */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 mt-2 sm:mt-2.5 pt-1">
        <div className="space-y-1">
          <div className="h-2 w-8 sm:w-10 bg-[#eeeae4]/50 rounded-full animate-shimmer" />
          <div className="h-3.5 sm:h-4 w-14 sm:w-16 bg-[#eeeae4] rounded-full animate-shimmer" />
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#eeeae4] animate-shimmer shrink-0" />
      </div>
    </div>
  );
}
