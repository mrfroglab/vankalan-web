export interface MidtransResult {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_time?: string;
  transaction_status?:
    | 'capture'
    | 'settlement'
    | 'pending'
    | 'deny'
    | 'expire'
    | 'cancel'
    | string;
  fraud_status?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  bill_key?: string;
  biller_code?: string;
  pdf_url?: string;
  finish_redirect_url?: string;
  [key: string]: unknown;
}

export interface SnapCallbacks {
  onSuccess?: (result: MidtransResult) => void;
  onPending?: (result: MidtransResult) => void;
  onError?: (result: MidtransResult) => void;
  onClose?: () => void;
}

export interface MidtransSnap {
  pay: (token: string, options?: SnapCallbacks) => void;
  show?: () => void;
  hide?: () => void;
}

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}
