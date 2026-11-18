'use client';

import { inputClass, textareaClass, iconButtonClass } from '@/components/ui/styles';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { makeSaveGuard } from '@/lib/saveGuard';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { menuService } from '@/services/menu';
import { formatRupiah } from '@/lib/constants';
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


/** ID sementara untuk item baru (di luar komponen: dipanggil saat aksi, bukan saat render). */
function newLocalId(prefix: string): string {
  return prefix + Date.now();
}

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
  const guard = makeSaveGuard(showToast, loadData);

  const handleToggleAvailable = guard(async (id: string) => {
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
  });

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

  const handleSaveMenu = guard(async (e: React.FormEvent) => {
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
        id: newLocalId('m_'),
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
  });

  const handleDeleteMenu = guard(async (id: string) => {
    const itemToDelete = menuList.find((m) => m.id === id);
    if (confirm(`Yakin ingin menghapus ${itemToDelete ? `"${itemToDelete.name}"` : 'menu ini'} dari katalog?`)) {
      const updated = menuList.filter((m) => m.id !== id);
      setMenuList(updated);
      await menuService.saveMenuItems(updated);
      setIsMenuModalOpen(false);
      showToast('Menu berhasil dihapus dari katalog.');
    }
  });

  const handleAddCategory = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    await menuService.saveCategories(updated);
    setNewCatName('');
    setIsCatModalOpen(false);
    showToast(`Kategori "${trimmed}" berhasil ditambahkan.`);
  });

  const handleDeleteCategory = guard(async (cat: string) => {
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
  });

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
    <div>
      <div className="space-y-6">

        {toastMessage && (
          <div
            role="status"
            className="p-3 px-4 bg-ink text-white text-xs font-semibold rounded-full shadow-dropdown flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <PageHeader
          title="Kelola Menu & Kategori"
          description="Atur katalog hidangan, harga dasar, opsi varian, dan ketersediaan menu."
          actions={
            <>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className={buttonClass('outline', 'md')}
            >
              <Tag className="w-4 h-4 text-muted" />
              <span>Kelola Kategori</span>
            </button>

            <button
              type="button"
              onClick={openAddMenuModal}
              className={buttonClass('gold', 'md')}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Menu Baru</span>
            </button>
            </>
          }
        />

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
                  className={`min-h-10 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gold text-ink border border-gold shadow-xs'
                      : 'bg-white hover:bg-surface-muted text-muted hover:text-ink border border-line'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-2xs px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-ink text-white'
                        : 'bg-cream text-muted'
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
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama menu..."
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {/* Menu Grid */}
        {filteredMenu.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center shadow-card">
            <p className="text-sm font-semibold text-ink">
              Tidak ada menu yang sesuai dengan filter.
            </p>
            <p className="text-xs text-muted mt-1">
              Coba ganti kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredMenu.map((m) => (
              <div
                key={m.id}
                className={`bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between group ${
                  !m.available ? 'opacity-85 bg-surface-muted/70' : ''
                }`}
              >
                <div>
                  {/* Thumbnail Gambar atau Fallback Ilustrasi */}
                  <div className="relative w-full h-36 bg-surface-muted rounded-xl overflow-hidden flex items-center justify-center border border-line-soft/60 mb-3">
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
                        className={`text-2xs font-bold px-2.5 py-0.5 rounded-full tracking-wide shadow-xs ${
                          m.available
                            ? 'bg-success-soft text-success-ink border border-success-line/70'
                            : 'bg-danger text-white'
                        }`}
                      >
                        {m.available ? 'Tersedia' : 'Habis'}
                      </span>

                      {m.popular && (
                        <span className="bg-gold text-ink text-2xs font-bold px-2.5 py-0.5 rounded-full tracking-wide shadow-xs">
                          Populer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kategori dan Judul */}
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                      {m.category}
                    </span>
                    <h3 className="font-semibold text-sm sm:text-base text-ink line-clamp-1 mt-0.5">
                      {m.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 mt-1 leading-snug">
                      {m.description || 'Pilihan hidangan lezat khas Warmindo Putra Vangkalan.'}
                    </p>
                  </div>

                  {/* Opsi Tambahan / Variasi */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.egg && (
                      <span className="inline-flex items-center gap-1 bg-cream text-muted px-2 py-0.5 rounded-full text-2xs font-medium border border-line">
                        <Egg className="w-2.5 h-2.5" />
                        <span>Opsi Telur</span>
                      </span>
                    )}

                    {m.temperatures?.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-cream text-muted px-2 py-0.5 rounded-full text-2xs font-medium border border-line"
                      >
                        {t === 'Panas' ? (
                          <Flame className="w-2.5 h-2.5 text-gold-ink" />
                        ) : (
                          <Coffee className="w-2.5 h-2.5 text-blue-700" />
                        )}
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>

                  {/* Harga Dasar */}
                  <div className="mt-3">
                    <span className="text-base font-bold text-ink">
                      {formatRupiah(m.price)}
                    </span>
                    {m.coldExtra ? (
                      <span className="text-2xs text-subtle ml-1.5">
                        (Dingin +{formatRupiah(m.coldExtra)})
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Baris Tombol Aksi */}
                <div className="pt-3.5 mt-3.5 border-t border-line-soft flex items-center gap-2">
                  {/* Quick Toggle Ketersediaan Stok */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(m.id)}
                    className={buttonClass(m.available ? 'outline' : 'danger', 'sm', 'flex-1')}
                    title={m.available ? 'Ubah status ke Habis' : 'Ubah status ke Tersedia'}
                  >
                    {m.available ? (
                      <>
                        <Eye className="w-4 h-4 text-success" />
                        <span>Tersedia</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Habis</span>
                      </>
                    )}
                  </button>

                  {/* Tombol Edit */}
                  <button
                    type="button"
                    onClick={() => openEditMenuModal(m)}
                    className={iconButtonClass}
                    title="Edit rincian menu"
                    aria-label={`Edit ${m.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMenu(m.id)}
                    className={`${iconButtonClass} hover:!text-danger hover:!bg-danger-soft hover:border-danger-line`}
                    title="Hapus menu dari katalog"
                  >
                    <Trash2 className="w-4 h-4" />
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
              <label className="text-xs font-semibold text-ink">
                Nama Menu <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Indomie Goreng Spesial Telur"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Kategori <span className="text-danger">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Harga Dasar (Rp) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Deskripsi</label>
              <textarea
                rows={2}
                maxLength={180}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Rasa gurih khas dengan taburan bawang goreng renyah..."
                className={textareaClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Jenis Ilustrasi Fallback</label>
              <select
                value={formKind}
                onChange={(e) => setFormKind(e.target.value as MenuItem['kind'])}
                className={inputClass}
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
            <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-3 text-xs">
              <p className="font-bold text-ink">Opsi & Variasi Tambahan</p>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formEgg}
                  onChange={(e) => setFormEgg(e.target.checked)}
                  className="w-4 h-4 accent-gold rounded"
                />
                <span className="font-medium text-ink">
                  Tawarkan Opsi Tambah Telur (Rebus / Ceplok / Dadar)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-soft">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formHot}
                    onChange={(e) => setFormHot(e.target.checked)}
                    className="w-4 h-4 accent-gold rounded"
                  />
                  <span className="font-medium text-ink">Opsi Suhu Panas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formCold}
                    onChange={(e) => setFormCold(e.target.checked)}
                    className="w-4 h-4 accent-gold rounded"
                  />
                  <span className="font-medium text-ink">Opsi Suhu Dingin</span>
                </label>
              </div>

              {formCold && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Biaya Tambahan Varian Dingin (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={formColdExtra}
                    onChange={(e) => setFormColdExtra(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-line-soft">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 accent-gold rounded"
                  />
                  <span className="font-medium text-ink">
                    Tandai sebagai Favorit Warung (Badge Populer)
                  </span>
                </label>
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-line-soft">
              {editingItem ? (
                <button
                  type="button"
                  onClick={() => handleDeleteMenu(editingItem.id)}
                  className={buttonClass('danger', 'sm')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Menu</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className={buttonClass('outline', 'sm')}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={buttonClass('gold', 'md')}
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
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                className={buttonClass('gold', 'md', 'shrink-0')}
              >
                Tambah
              </button>
            </form>

            <div className="divide-y divide-line-soft border border-line rounded-2xl bg-white overflow-hidden">
              {categories.map((c) => {
                const itemCount = menuList.filter((m) => m.category === c).length;
                return (
                  <div
                    key={c}
                    className="px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-ink">{c}</span>
                      <span className="text-2xs text-subtle ml-2">
                        ({itemCount} hidangan)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c)}
                      className="text-danger hover:underline font-semibold cursor-pointer py-1 px-2"
                    >
                      Hapus
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="text-right pt-2 border-t border-line-soft">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className={buttonClass('outline', 'sm')}
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
