'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { menuService } from '@/services/menu';
import { formatRupiah } from '@/lib/constants';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { FoodIllustration } from '@/components/customer/FoodIllustration';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Flame,
  Coffee,
  Egg,
} from 'lucide-react';

export default function AdminMenuPage() {
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Modal Tambah / Edit Menu
  const [isMenuModalOpen, setIsMenuModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(10000);
  const [formCategory, setFormCategory] = useState<string>('Mi');
  const [formKind, setFormKind] = useState<MenuItem['kind']>('noodle');
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [formEgg, setFormEgg] = useState<boolean>(false);
  const [formHot, setFormHot] = useState<boolean>(false);
  const [formCold, setFormCold] = useState<boolean>(false);
  const [formColdExtra, setFormColdExtra] = useState<number>(1000);
  const [formPopular, setFormPopular] = useState<boolean>(false);

  // State Modal Kategori
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [items, cats] = await Promise.all([
        menuService.getMenuItems(),
        menuService.getCategories(),
      ]);
      setMenuList(items);
      setCategories(cats);
    } catch (e) {
      console.warn('Gagal memuat data menu:', e);
    }
  };

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

  // Toggle ketersediaan menu secara instan (FR-42)
  const handleToggleAvailable = async (id: string) => {
    const targetItem = menuList.find((m) => m.id === id);
    const updated = menuList.map((m) =>
      m.id === id ? { ...m, available: !m.available } : m
    );
    setMenuList(updated);
    await menuService.saveMenuItems(updated);
    if (targetItem) {
      showToast(
        !targetItem.available
          ? `Status ${targetItem.name} diubah menjadi Tersedia.`
          : `Status ${targetItem.name} diubah menjadi Habis.`
      );
    }
  };

  const openAddMenuModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDesc('');
    setFormPrice(10000);
    setFormCategory(categories[0] || 'Mi');
    setFormKind('noodle');
    setFormAvailable(true);
    setFormEgg(false);
    setFormHot(false);
    setFormCold(false);
    setFormColdExtra(1000);
    setFormPopular(false);
    setIsMenuModalOpen(true);
  };

  const openEditMenuModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description);
    setFormPrice(item.price);
    setFormCategory(item.category);
    setFormKind(item.kind);
    setFormAvailable(item.available);
    setFormEgg(!!item.egg);
    setFormHot(!!item.temperatures?.includes('Panas'));
    setFormCold(!!item.temperatures?.includes('Dingin'));
    setFormColdExtra(item.coldExtra || 0);
    setFormPopular(!!item.popular);
    setIsMenuModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const temps: ('Panas' | 'Dingin')[] = [];
    if (formHot) temps.push('Panas');
    if (formCold) temps.push('Dingin');

    if (editingItem) {
      // Edit
      const updated = menuList.map((m) =>
        m.id === editingItem.id
          ? {
              ...m,
              name: formName.trim(),
              description: formDesc.trim(),
              price: Number(formPrice),
              category: formCategory,
              kind: formKind,
              available: formAvailable,
              egg: formEgg,
              temperatures: temps.length > 0 ? temps : undefined,
              coldExtra: formCold ? Number(formColdExtra) : undefined,
              popular: formPopular,
            }
          : m
      );
      setMenuList(updated);
      await menuService.saveMenuItems(updated);
      showToast(`Menu "${formName.trim()}" berhasil diperbarui.`);
    } else {
      // Tambah baru
      const newItem: MenuItem = {
        id: 'm_' + Date.now(),
        name: formName.trim(),
        description: formDesc.trim(),
        price: Number(formPrice),
        category: formCategory,
        kind: formKind,
        available: formAvailable,
        egg: formEgg,
        temperatures: temps.length > 0 ? temps : undefined,
        coldExtra: formCold ? Number(formColdExtra) : undefined,
        popular: formPopular,
      };
      const updated = [...menuList, newItem];
      setMenuList(updated);
      await menuService.saveMenuItems(updated);
      showToast(`Menu baru "${formName.trim()}" berhasil ditambahkan.`);
    }

    setIsMenuModalOpen(false);
  };

  const handleDeleteMenu = async (id: string) => {
    const itemToDelete = menuList.find((m) => m.id === id);
    if (confirm(`Yakin ingin menghapus ${itemToDelete ? `"${itemToDelete.name}"` : 'menu ini'} dari katalog?`)) {
      const updated = menuList.filter((m) => m.id !== id);
      setMenuList(updated);
      await menuService.saveMenuItems(updated);
      setIsMenuModalOpen(false);
      showToast('Menu berhasil dihapus dari katalog.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    await menuService.saveCategories(updated);
    setNewCatName('');
    setIsCatModalOpen(false);
    showToast(`Kategori "${trimmed}" berhasil ditambahkan.`);
  };

  const handleDeleteCategory = async (cat: string) => {
    const hasItems = menuList.some((m) => m.category === cat);
    if (hasItems) {
      alert(`Kategori "${cat}" masih memiliki menu aktif. Pindahkan menu terlebih dahulu sebelum menghapus kategori.`);
      return;
    }
    if (confirm(`Hapus kategori "${cat}"?`)) {
      const updated = categories.filter((c) => c !== cat);
      setCategories(updated);
      await menuService.saveCategories(updated);
      if (selectedCategory === cat) setSelectedCategory('Semua');
      showToast(`Kategori "${cat}" berhasil dihapus.`);
    }
  };

  const filteredMenu = useMemo(() => {
    return menuList.filter((m) => {
      const matchCategory = selectedCategory === 'Semua' || m.category === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [menuList, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#f5f2ed] min-h-screen py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminHeader />

        {toastMessage && (
          <div
            role="status"
            className="p-3 px-4 bg-[#242321] text-white text-xs font-semibold rounded-full shadow-dropdown flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Kelola Menu & Kategori */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e9e5df] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321]">
              Kelola Menu & Kategori
            </h2>
            <p className="text-xs sm:text-sm text-[#68645e] mt-1 leading-normal">
              Atur katalog hidangan, sesuaikan harga dasar, kelola opsi varian, dan pantau ketersediaan stok bahan baku.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#242321] border border-[#e9e5df] font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Tag className="w-4 h-4 text-[#68645e]" />
              <span>Kelola Kategori</span>
            </button>

            <button
              type="button"
              onClick={openAddMenuModal}
              className="min-h-[44px] px-5 py-2 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Menu Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Bar Kategori & Pencarian */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Chips Kategori */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
            role="tablist"
            aria-label="Pilihan kategori menu"
          >
            {['Semua', ...categories].map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'Semua'
                  ? menuList.length
                  : menuList.filter((m) => m.category === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#f5c943] text-[#242321] border border-[#f5c943] shadow-xs'
                      : 'bg-white hover:bg-[#fbf9f5] text-[#68645e] hover:text-[#242321] border border-[#e9e5df]'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-[#242321] text-white'
                        : 'bg-[#f1ede7] text-[#68645e]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kotak Pencarian Ringkas */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#918c84]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama menu..."
              className="w-full min-h-[40px] pl-9 pr-3.5 text-xs bg-white border border-[#e9e5df] rounded-full text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943]"
            />
          </div>
        </div>

        {/* Menu Grid */}
        {filteredMenu.length === 0 ? (
          <div className="bg-white border border-[#e9e5df] rounded-2xl p-12 text-center shadow-card">
            <p className="text-sm font-semibold text-[#242321]">
              Tidak ada menu yang sesuai dengan filter.
            </p>
            <p className="text-xs text-[#68645e] mt-1">
              Coba ganti kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredMenu.map((m) => (
              <div
                key={m.id}
                className={`bg-white border border-[#e9e5df] rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between group ${
                  !m.available ? 'opacity-85 bg-[#fbf9f5]/70' : ''
                }`}
              >
                <div>
                  {/* Thumbnail Gambar atau Fallback Ilustrasi */}
                  <div className="relative w-full h-36 bg-[#fbf9f5] rounded-xl overflow-hidden flex items-center justify-center border border-[#eeeae4]/60 mb-3">
                    {m.image ? (
                      <Image
                        src={m.image}
                        alt={m.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FoodIllustration kind={m.kind} className="w-full h-full p-2" />
                    )}

                    {/* Status Badges di Sudut Atas */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide shadow-xs ${
                          m.available
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                            : 'bg-[#d94b3d] text-white'
                        }`}
                      >
                        {m.available ? 'Tersedia' : 'Habis'}
                      </span>

                      {m.popular && (
                        <span className="bg-[#f8d84f] text-[#242321] text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide shadow-xs">
                          Populer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kategori dan Judul */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#918c84]">
                      {m.category}
                    </span>
                    <h3 className="font-semibold text-sm sm:text-base text-[#242321] line-clamp-1 mt-0.5">
                      {m.name}
                    </h3>
                    <p className="text-xs text-[#68645e] line-clamp-2 mt-1 leading-snug">
                      {m.description || 'Pilihan hidangan lezat khas Warmindo Putra Vangkalan.'}
                    </p>
                  </div>

                  {/* Opsi Tambahan / Variasi */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.egg && (
                      <span className="inline-flex items-center gap-1 bg-[#f1ede7] text-[#68645e] px-2 py-0.5 rounded text-[10px] font-medium border border-[#e9e5df]">
                        <Egg className="w-2.5 h-2.5" />
                        <span>Opsi Telur</span>
                      </span>
                    )}

                    {m.temperatures?.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-[#f1ede7] text-[#68645e] px-2 py-0.5 rounded text-[10px] font-medium border border-[#e9e5df]"
                      >
                        {t === 'Panas' ? (
                          <Flame className="w-2.5 h-2.5 text-amber-700" />
                        ) : (
                          <Coffee className="w-2.5 h-2.5 text-blue-700" />
                        )}
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>

                  {/* Harga Dasar */}
                  <div className="mt-3">
                    <span className="text-base font-bold text-[#242321]">
                      {formatRupiah(m.price)}
                    </span>
                    {m.coldExtra ? (
                      <span className="text-[11px] text-[#918c84] ml-1.5">
                        (Dingin +{formatRupiah(m.coldExtra)})
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Baris Tombol Aksi */}
                <div className="pt-3.5 mt-3.5 border-t border-[#eeeae4] flex items-center gap-2">
                  {/* Quick Toggle Ketersediaan Stok */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(m.id)}
                    className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      m.available
                        ? 'bg-white hover:bg-[#fbf9f5] text-[#242321] border-[#e9e5df]'
                        : 'bg-[#d94b3d]/10 hover:bg-[#d94b3d]/20 text-[#d94b3d] border-[#d94b3d]/30'
                    }`}
                    title={m.available ? 'Ubah status ke Habis' : 'Ubah status ke Tersedia'}
                  >
                    {m.available ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tersedia</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Habis</span>
                      </>
                    )}
                  </button>

                  {/* Tombol Edit */}
                  <button
                    type="button"
                    onClick={() => openEditMenuModal(m)}
                    className="min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold border border-[#e9e5df] bg-white hover:bg-[#fbf9f5] text-[#242321] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Edit rincian menu"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#68645e]" />
                    <span>Edit</span>
                  </button>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMenu(m.id)}
                    className="w-[38px] h-[38px] rounded-full text-xs font-bold border border-[#e9e5df] hover:border-[#d94b3d]/30 bg-white hover:bg-[#d94b3d]/10 text-[#68645e] hover:text-[#d94b3d] inline-flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                    title="Hapus menu dari katalog"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Tambah / Edit Menu */}
        <Modal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          title={editingItem ? 'Edit Rincian Menu' : 'Tambah Menu Baru'}
        >
          <form onSubmit={handleSaveMenu} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#242321]">
                Nama Menu <span className="text-[#d94b3d]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Indomie Goreng Spesial Telur"
                className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#242321]">
                  Kategori <span className="text-[#d94b3d]">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] focus:outline-none focus:border-[#f5c943]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#242321]">
                  Harga Dasar (Rp) <span className="text-[#d94b3d]">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#242321]">Deskripsi</label>
              <textarea
                rows={2}
                maxLength={180}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Rasa gurih khas dengan taburan bawang goreng renyah..."
                className="w-full p-3.5 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-2xl text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#242321]">Jenis Ilustrasi Fallback</label>
              <select
                value={formKind}
                onChange={(e) => setFormKind(e.target.value as MenuItem['kind'])}
                className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] focus:outline-none focus:border-[#f5c943]"
              >
                <option value="noodle">Mi Goreng</option>
                <option value="soup">Mi Kuah</option>
                <option value="rice">Nasi</option>
                <option value="toast">Roti Bakar</option>
                <option value="tea">Teh</option>
                <option value="coffee">Kopi</option>
                <option value="orange">Jeruk</option>
              </select>
            </div>

            {/* Opsi & Variasi Menu */}
            <div className="p-4 bg-[#fbf9f5] rounded-2xl border border-[#e9e5df] space-y-3 text-xs">
              <p className="font-bold text-[#242321]">Opsi & Variasi Tambahan</p>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formEgg}
                  onChange={(e) => setFormEgg(e.target.checked)}
                  className="w-4 h-4 accent-[#f5c943] rounded"
                />
                <span className="font-medium text-[#242321]">
                  Tawarkan Opsi Tambah Telur (Rebus / Ceplok / Dadar)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#eeeae4]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formHot}
                    onChange={(e) => setFormHot(e.target.checked)}
                    className="w-4 h-4 accent-[#f5c943] rounded"
                  />
                  <span className="font-medium text-[#242321]">Opsi Suhu Panas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formCold}
                    onChange={(e) => setFormCold(e.target.checked)}
                    className="w-4 h-4 accent-[#f5c943] rounded"
                  />
                  <span className="font-medium text-[#242321]">Opsi Suhu Dingin</span>
                </label>
              </div>

              {formCold && (
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-[#68645e] block mb-1">
                    Biaya Tambahan Varian Dingin (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={formColdExtra}
                    onChange={(e) => setFormColdExtra(Number(e.target.value))}
                    className="w-full min-h-[38px] px-3.5 text-xs bg-white border border-[#e9e5df] rounded-full text-[#242321] focus:outline-none focus:border-[#f5c943]"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#eeeae4]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 accent-[#f5c943] rounded"
                  />
                  <span className="font-medium text-[#242321]">
                    Tandai sebagai Favorit Warung (Badge Populer)
                  </span>
                </label>
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-[#eeeae4]">
              {editingItem ? (
                <button
                  type="button"
                  onClick={() => handleDeleteMenu(editingItem.id)}
                  className="min-h-[42px] px-4 py-2 bg-[#d94b3d]/10 hover:bg-[#d94b3d]/20 text-[#d94b3d] border border-[#d94b3d]/30 font-bold text-xs rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Menu</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#68645e] border border-[#e9e5df] font-bold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  Simpan Menu
                </button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Modal Kelola Kategori */}
        <Modal
          isOpen={isCatModalOpen}
          onClose={() => setIsCatModalOpen(false)}
          title="Kelola Kategori Menu"
        >
          <div className="space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                required
                maxLength={30}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="flex-1 min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs cursor-pointer transition-colors shrink-0"
              >
                Tambah
              </button>
            </form>

            <div className="divide-y divide-[#eeeae4] border border-[#e9e5df] rounded-2xl bg-white overflow-hidden">
              {categories.map((c) => {
                const itemCount = menuList.filter((m) => m.category === c).length;
                return (
                  <div
                    key={c}
                    className="px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#242321]">{c}</span>
                      <span className="text-[11px] text-[#918c84] ml-2">
                        ({itemCount} hidangan)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c)}
                      className="text-[#d94b3d] hover:underline font-semibold cursor-pointer py-1 px-2"
                    >
                      Hapus
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="text-right pt-2 border-t border-[#eeeae4]">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="min-h-[40px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#68645e] border border-[#e9e5df] font-bold text-xs rounded-full cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
