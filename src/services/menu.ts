/**
 * Menu & categories service layer for Web Warmindo Putra Vangkalan.
 * Routes to REST API when NEXT_PUBLIC_API_URL is configured,
 * Without a backend (demo mode) data lives in src/lib/store.ts (localStorage).
 * With a backend, failures are surfaced to the caller; they never fall back to local data.
 */

import { MenuItem } from '@/types';
import * as localStore from '@/lib/store';
import { isBackendConfigured, apiRequest, backendFailure, unexpectedResponse } from './client';

export const menuService = {
  async getMenuItems(): Promise<MenuItem[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<MenuItem[] | { data: MenuItem[] }>('/api/menu');
        if (Array.isArray(result)) return result;
        if (result && Array.isArray((result as { data: MenuItem[] }).data)) {
          return (result as { data: MenuItem[] }).data;
        }
      } catch (err) {
        throw backendFailure('menuService.getMenuItems', err);
      }
      throw unexpectedResponse('menuService.getMenuItems');
    }
    return localStore.getMenuItems();
  },

  async saveMenuItems(items: MenuItem[]): Promise<MenuItem[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<MenuItem[] | { data: MenuItem[] }>('/api/menu', {
          method: 'PUT',
          body: JSON.stringify({ items }),
        });
        const saved = Array.isArray(result)
          ? result
          : (result as { data: MenuItem[] })?.data || items;
        localStore.saveMenuItems(saved);
        return saved;
      } catch (err) {
        throw backendFailure('menuService.saveMenuItems', err);
      }
      throw unexpectedResponse('menuService.saveMenuItems');
    }
    localStore.saveMenuItems(items);
    return items;
  },

  async getCategories(): Promise<string[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<string[] | { data: string[] }>('/api/categories');
        if (Array.isArray(result)) return result;
        if (result && Array.isArray((result as { data: string[] }).data)) {
          return (result as { data: string[] }).data;
        }
      } catch (err) {
        throw backendFailure('menuService.getCategories', err);
      }
      throw unexpectedResponse('menuService.getCategories');
    }
    return localStore.getCategories();
  },

  async saveCategories(categories: string[]): Promise<string[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<string[] | { data: string[] }>('/api/categories', {
          method: 'PUT',
          body: JSON.stringify({ categories }),
        });
        const saved = Array.isArray(result)
          ? result
          : (result as { data: string[] })?.data || categories;
        localStore.saveCategories(saved);
        return saved;
      } catch (err) {
        throw backendFailure('menuService.saveCategories', err);
      }
      throw unexpectedResponse('menuService.saveCategories');
    }
    localStore.saveCategories(categories);
    return categories;
  },
};
