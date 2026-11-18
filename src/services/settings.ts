/**
 * Store settings & shifts service layer for Web Warmindo Putra Vangkalan.
 * Routes to REST API when NEXT_PUBLIC_API_URL is configured,
 * Without a backend (demo mode) data lives in src/lib/store.ts (localStorage).
 * With a backend, failures are surfaced to the caller; they never fall back to local data.
 */

import { StoreSettings, Shift } from '@/types';
import * as localStore from '@/lib/store';
import { isBackendConfigured, apiRequest, backendFailure, unexpectedResponse } from './client';

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
        throw backendFailure('settingsService.getStoreSettings', err);
      }
      throw unexpectedResponse('settingsService.getStoreSettings');
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
        throw backendFailure('settingsService.saveStoreSettings', err);
      }
      throw unexpectedResponse('settingsService.saveStoreSettings');
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
        throw backendFailure('settingsService.getShifts', err);
      }
      throw unexpectedResponse('settingsService.getShifts');
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
        throw backendFailure('settingsService.saveShifts', err);
      }
      throw unexpectedResponse('settingsService.saveShifts');
    }
    localStore.saveShifts(shifts);
    return shifts;
  },

  async resetAllData(): Promise<void> {
    if (isBackendConfigured()) {
      try {
        await apiRequest<void>('/api/reset', { method: 'POST' });
      } catch (err) {
        throw backendFailure('settingsService.reset', err);
      }
    }
    localStore.resetAllData();
  },
};
