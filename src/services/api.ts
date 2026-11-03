/**
 * Unified API facade for Web Warmindo Putra Vangkalan.
 * Exposes orders, menu, settings, midtrans, and base client methods under a single namespace.
 */

import { orderService } from './orders';
import { menuService } from './menu';
import { settingsService } from './settings';
import { midtransService } from './midtrans';
import { isBackendConfigured, apiRequest, ApiError, getBaseApiUrl } from './client';

export const api = {
  orders: orderService,
  menu: menuService,
  settings: settingsService,
  midtrans: midtransService,
  isBackendConfigured,
  getBaseApiUrl,
  request: apiRequest,
};

export { ApiError };
export default api;
