/**
 * Store settings & shifts service layer for Web Warmindo Putra Vangkalan.
 * Routes to REST API when NEXT_PUBLIC_API_URL is configured,
 * falling back transparently to src/lib/store.ts (localStorage).
 */

import { StoreSettings, Shift } from '@/types';
import * as localStore from '@/lib/store';
import { isBackendConfigured, apiRequest } from './client';

export { DEFAULT_SETTINGS } from '@/lib/store';

export const settingsService = {
  async getStoreSettings(): Promise<StoreSettings> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<StoreSettings | { data: StoreSettings }>(
          '/api/settings'
        );
        if (result && 'open' in result) return result as StoreSettings;
        if (result && (result as { data: StoreSettings }).data) {
          return (result as { data: StoreSettings }).data;
        }
      } catch (err) {
        console.warn('[settingsService] Backend getStoreSettings failed, using local store:', err);
      }
    }
    return localStore.getStoreSettings();
  },

  async saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<StoreSettings | { data: StoreSettings }>(
          '/api/settings',
          {
            method: 'PATCH',
            body: JSON.stringify(settings),
          }
        );
        const saved =
          result && 'open' in result
            ? (result as StoreSettings)
            : (result as { data: StoreSettings })?.data || settings;
        localStore.saveStoreSettings(saved);
        return saved;
      } catch (err) {
        console.warn('[settingsService] Backend saveStoreSettings failed, using local store:', err);
      }
    }
    localStore.saveStoreSettings(settings);
    return settings;
  },

  async getShifts(): Promise<Shift[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<Shift[] | { data: Shift[] }>('/api/shifts');
        if (Array.isArray(result)) return result;
        if (result && Array.isArray((result as { data: Shift[] }).data)) {
          return (result as { data: Shift[] }).data;
        }
      } catch (err) {
        console.warn('[settingsService] Backend getShifts failed, using local store:', err);
      }
    }
    return localStore.getShifts();
  },

  async saveShifts(shifts: Shift[]): Promise<Shift[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<Shift[] | { data: Shift[] }>('/api/shifts', {
          method: 'PUT',
          body: JSON.stringify({ shifts }),
        });
        const saved = Array.isArray(result)
          ? result
          : (result as { data: Shift[] })?.data || shifts;
        localStore.saveShifts(saved);
        return saved;
      } catch (err) {
        console.warn('[settingsService] Backend saveShifts failed, using local store:', err);
      }
    }
    localStore.saveShifts(shifts);
    return shifts;
  },

  async resetAllData(): Promise<void> {
    if (isBackendConfigured()) {
      try {
        await apiRequest<void>('/api/reset', { method: 'POST' });
      } catch (err) {
        console.warn('[settingsService] Backend reset failed, resetting local store:', err);
      }
    }
    localStore.resetAllData();
  },
};
