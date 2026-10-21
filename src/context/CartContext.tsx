'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MenuItem } from '@/types';

export interface CartItem {
  id: string; // unique cart item id
  menuItem: MenuItem;
  qty: number;
  egg?: boolean;
  temp?: 'Panas' | 'Dingin';
  note?: string;
  unitPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'unitPrice'>) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  eggPrice: number;
  isStoreOpen: boolean;
  estimateMinutes: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'pv_warmindo_cart_v2';
const DEFAULT_EGG_PRICE = 4000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isStoreOpen] = useState<boolean>(true);
  const [estimateMinutes] = useState<number>(10);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Muat dari localStorage saat client render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Gagal memuat keranjang dari localStorage', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Simpan ke localStorage saat items berubah
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Gagal menyimpan keranjang ke localStorage', e);
    }
  }, [items, isHydrated]);

  const calculateUnitPrice = (
    menuItem: MenuItem,
    egg?: boolean,
    temp?: 'Panas' | 'Dingin'
  ): number => {
    let price = menuItem.price;
    if (egg) price += DEFAULT_EGG_PRICE;
    if (temp === 'Dingin' && menuItem.coldExtra) price += menuItem.coldExtra;
    return price;
  };

  const addItem = (newItemData: Omit<CartItem, 'id' | 'unitPrice'>) => {
    const unitPrice = calculateUnitPrice(
      newItemData.menuItem,
      newItemData.egg,
      newItemData.temp
    );

    // Cek apakah item dengan menu, opsi telur, opsi suhu, dan catatan yang persis sama sudah ada
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (it) =>
          it.menuItem.id === newItemData.menuItem.id &&
          it.egg === newItemData.egg &&
          it.temp === newItemData.temp &&
          (it.note || '').trim() === (newItemData.note || '').trim()
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += newItemData.qty;
        return updated;
      }

      const cartItem: CartItem = {
        ...newItemData,
        id: 'cart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        unitPrice,
      };
      return [...prev, cartItem];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        totalItems,
        totalAmount,
        eggPrice: DEFAULT_EGG_PRICE,
        isStoreOpen,
        estimateMinutes,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
