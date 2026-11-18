import type { OrderFulfillmentStatus, OrderNotificationStatus, OrderPaymentStatus } from '@/types';

/** Label status yang tampil ke pengguna. Satu sumber supaya istilahnya sama di semua halaman. */
export const FULFILLMENT_LABEL: Record<OrderFulfillmentStatus, string> = {
  NEW: 'Diterima Dapur',
  PREPARING: 'Sedang Dimasak',
  READY: 'Siap Diambil',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export type BadgeTone = 'success' | 'warning' | 'danger';

export const PAYMENT_BADGE: Record<OrderPaymentStatus, { text: string; variant: BadgeTone }> = {
  PAID: { text: 'Lunas', variant: 'success' },
  PENDING: { text: 'Menunggu Bayar', variant: 'warning' },
  FAILED: { text: 'Gagal', variant: 'danger' },
  EXPIRED: { text: 'Kedaluwarsa', variant: 'danger' },
};

export const NOTIFICATION_LABEL: Record<OrderNotificationStatus, string> = {
  QUEUED: 'Antre',
  SENT: 'Terkirim',
  FAILED: 'Gagal',
  UNKNOWN: 'Belum pasti',
};
