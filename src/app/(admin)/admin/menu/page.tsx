'use client';

import React, { useState, useEffect } from 'react';
import { MenuItem } from '@/types';
import { getMenuItems, saveMenuItems, getCategories, saveCategories } from '@/lib/store';
import { formatRupiah } from '@/lib/constants';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminMenuPage() {
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // State Modal Tambah/Edit Menu
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

  const loadData = () => {
    setMenuList(getMenuItems());
    setCategories(getCategories());
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
  const handleToggleAvailable = (id: string) => {
    const updated = menuList.map((m) =>
      m.id === id ? { ...m, available: !m.available } : m
    );
    setMenuList(updated);
    saveMenuItems(updated);
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

  const handleSaveMenu = (e: React.FormEvent) => {
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
      saveMenuItems(updated);
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
      saveMenuItems(updated);
    }

    setIsMenuModalOpen(false);
  };

  const handleDeleteMenu = (id: string) => {
    if (confirm('Yakin ingin menghapus menu ini dari katalog?')) {
      const updated = menuList.filter((m) => m.id !== id);
      setMenuList(updated);
      saveMenuItems(updated);
      setIsMenuModalOpen(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveCategories(updated);
    setNewCatName('');
    setIsCatModalOpen(false);
  };

  const handleDeleteCategory = (cat: string) => {
    const hasItems = menuList.some((m) => m.category === cat);
    if (hasItems) {
      alert(`Kategori "${cat}" masih memiliki menu. Pindahkan menu terlebih dahulu sebelum menghapus kategori.`);
      return;
    }
    if (confirm(`Hapus kategori "${cat}"?`)) {
      const updated = categories.filter((c) => c !== cat);
      setCategories(updated);
      saveCategories(updated);
      if (selectedCategory === cat) setSelectedCategory('Semua');
    }
  };

  const filteredMenu = menuList.filter(
    (m) => selectedCategory === 'Semua' || m.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-paper py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeader />

        {/* Section Header & Actions */}
        <div className="bg-white p-5 rounded-2xl border border-border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink">Kelola Katalog Menu</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Tambah, edit harga, sesuaikan varian telur/minuman, atau ubah status stok habis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCatModalOpen(true)}
            >
              <Tag className="w-4 h-4 mr-1.5" />
              <span>Kelola Kategori</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={openAddMenuModal}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tambah Menu</span>
            </Button>
          </div>
        </div>

        {/* Filter Kategori */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['Semua', ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-text-muted hover:text-ink border-border-line'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tabel Menu */}
        <div className="bg-white rounded-2xl border border-border-line overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-text-muted font-bold uppercase tracking-wider border-b border-border-line">
                <tr>
                  <th className="py-3 px-4">Menu</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Harga Dasar</th>
                  <th className="py-3 px-4">Opsi</th>
                  <th className="py-3 px-4 text-center">Status Stok</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line">
                {filteredMenu.map((m) => (
                  <tr
                    key={m.id}
                    className={`hover:bg-neutral-50/60 transition-colors ${
                      !m.available ? 'bg-neutral-50/40 text-text-muted' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-ink text-sm">{m.name}</div>
                      <div className="text-[11px] text-text-muted line-clamp-1 max-w-xs">
                        {m.description}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-ink">
                      {m.category}
                    </td>

                    <td className="py-3 px-4 font-bold text-ink">
                      {formatRupiah(m.price)}
                    </td>

                    <td className="py-3 px-4 text-text-muted">
                      <div className="flex flex-wrap gap-1">
                        {m.egg && (
                          <span className="bg-soft-green text-brand-green px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            +Telur
                          </span>
                        )}
                        {m.temperatures?.map((t) => (
                          <span
                            key={t}
                            className="bg-neutral-100 text-text-muted px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                        {m.popular && (
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            Favorit
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailable(m.id)}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          m.available
                            ? 'bg-soft-green border-brand-green/30 text-brand-green hover:bg-soft-green/80'
                            : 'bg-danger-red/10 border-danger-red/30 text-danger-red hover:bg-danger-red/20'
                        }`}
                        title="Klik untuk ubah ketersediaan menu secara langsung"
                      >
                        {m.available ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Tersedia</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Habis</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditMenuModal(m)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Tambah / Edit Menu */}
        <Modal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          title={editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
        >
          <form onSubmit={handleSaveMenu} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Nama Menu *</label>
              <input
                type="text"
                required
                maxLength={60}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Indomie Goreng Spesial"
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Kategori *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Harga Dasar (Rp) *</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Deskripsi</label>
              <textarea
                rows={2}
                maxLength={180}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Deskripsi singkat menu..."
                className="w-full p-3 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Jenis Ilustrasi Fallback</label>
              <select
                value={formKind}
                onChange={(e) => setFormKind(e.target.value as MenuItem['kind'])}
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
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

            {/* Opsi Tambahan */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-border-line space-y-2.5 text-xs">
              <p className="font-bold text-ink">Opsi & Varian</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEgg}
                  onChange={(e) => setFormEgg(e.target.checked)}
                  className="accent-brand-green"
                />
                <span>Tawarkan Opsi Tambah Telur</span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-line">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHot}
                    onChange={(e) => setFormHot(e.target.checked)}
                    className="accent-brand-green"
                  />
                  <span>Opsi Panas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCold}
                    onChange={(e) => setFormCold(e.target.checked)}
                    className="accent-brand-green"
                  />
                  <span>Opsi Dingin</span>
                </label>
              </div>

              {formCold && (
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Biaya Tambahan Dingin (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={formColdExtra}
                    onChange={(e) => setFormColdExtra(Number(e.target.value))}
                    className="w-full min-h-[38px] px-3 text-xs bg-white border border-border-line rounded-lg focus:outline-none focus:border-brand-green"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-border-line">
                <input
                  type="checkbox"
                  checked={formPopular}
                  onChange={(e) => setFormPopular(e.target.checked)}
                  className="accent-brand-green"
                />
                <span>Tandai sebagai Favorit Warung</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              {editingItem ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteMenu(editingItem.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span>Hapus</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMenuModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Simpan Menu
                </Button>
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
                className="flex-1 min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
              <Button type="submit" variant="primary" size="sm">
                Tambah
              </Button>
            </form>

            <div className="divide-y divide-border-line border border-border-line rounded-xl bg-white overflow-hidden">
              {categories.map((c) => (
                <div
                  key={c}
                  className="px-4 py-3 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-ink">{c}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c)}
                    className="text-danger-red hover:underline font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCatModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
