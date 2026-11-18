import { AdminSidebar } from '@/components/admin/AdminSidebar';

/** Kerangka halaman admin (kecuali login): sidebar di kiri, konten di kanan. */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 lg:py-8 lg:flex lg:items-start lg:gap-6">
        <AdminSidebar />
        <main className="flex-1 min-w-0 mt-4 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
