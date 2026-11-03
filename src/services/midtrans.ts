/**
 * Midtrans service re-export for centralized service layer.
 */

export * from '@/lib/midtrans';

import {
  loadSnapScript,
  triggerSnapPayment,
  isSnapAvailable,
} from '@/lib/midtrans';

export const midtransService = {
  loadSnapScript,
  triggerSnapPayment,
  isSnapAvailable,
};
