'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MenuItem } from '@/types';
import { getStoreSettings, DEFAULT_SETTINGS } from '@/lib/store';

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(DEFAULT_SETTINGS.open);
  const [estimateMinutes, setEstimateMinutes] = useState<number>(DEFAULT_SETTINGS.estimate);
  const [eggPrice, setEggPrice] = useState<number>(DEFAULT_SETTINGS.eggPrice);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const syncSettings = useCallback(() => {
    const s = getStoreSettings();
    setIsStoreOpen(s.open);
    setEstimateMinutes(s.estimate);
    setEggPrice(s.eggPrice);
  }, []);

  // Muat dari localStorage saat client render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
      syncSettings();
    } catch (e) {
      console.warn('Gagal memuat keranjang dari localStorage', e);
    } finally {
      setIsHydrated(true);
    }

    const handleStorageUpdate = () => {
      syncSettings();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('pv_storage_update', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('pv_storage_update', handleStorageUpdate);
    };
  }, [syncSettings]);

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
    if (egg) price += eggPrice;
    if (temp === 'Dingin' && menuItem.coldExtra) price += menuItem.coldExtra;
    return price;
  };

  const addItem = (newItemData: Omit<CartItem, 'id' | 'unitPrice'>) => {
    const unitPrice = calculateUnitPrice(
      newItemData.menuItem,
      newItemData.egg,
      newItemData.temp
    );

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

  const totalItems = items.reduce((acc, curr) => acc + curr.qty, 0);
  const totalAmount = items.reduce(
    (acc, curr) => acc + curr.unitPrice * curr.qty,
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
        eggPrice,
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
