export type Category = 'Mi' | 'Nasi' | 'Camilan' | 'Minuman';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  kind: 'noodle' | 'soup' | 'rice' | 'toast' | 'tea' | 'coffee' | 'orange';
  available: boolean;
  egg?: boolean;
  popular?: boolean;
  temperatures?: ('Panas' | 'Dingin')[];
  coldExtra?: number;
}

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
export type OrderFulfillmentStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type OrderNotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'UNKNOWN';

export interface OrderItem {
  name: string;
  qty: number;
  unit: number;
  egg?: boolean;
  temp?: 'Panas' | 'Dingin';
  note?: string;
}

export interface Order {
  id: string;
  token: string;
  number: string;
  created: number;
  pickup: number;
  estimate: number;
  mode: 'asap' | 'scheduled';
  name: string;
  phone: string;
  note?: string;
  payment: OrderPaymentStatus;
  fulfillment: OrderFulfillmentStatus;
  notification: OrderNotificationStatus;
  recipientShiftId: string;
  items: OrderItem[];
  total: number;
  paidAt?: number;
}

export interface Shift {
  id: string;
  name: string;
  phone: string;
}

export interface StoreSettings {
  open: boolean;
  estimate: number; // estimasi menit persiapan
  eggPrice: number; // biaya tambahan telur
  recipientShiftId: string; // id penjaga yang sedang bertugas
  waConnected: boolean;
}
