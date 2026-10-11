import { api } from '../../api/client';

export interface CustomerPaymentMethod {
  method: 'card_to_card' | 'bale_wallet';
  title: string;
  description: string;
  bankName?: string | null;
  cardholderName?: string | null;
  cardNumber?: string | null;
  formattedCardNumber?: string | null;
  accountIban?: string | null;
  instructions?: string | null;
  manualReviewMessage?: string | null;
  manualReviewHoldHours?: number | null;
  botUsername?: string | null;
}

export interface CustomerPaymentAttempt {
  id: string;
  orderId: string;
  method: 'card_to_card' | 'bale_wallet';
  status: 'created' | 'awaiting_customer' | 'pending_verification' | 'verified' | 'rejected' | 'failed' | 'expired';
  amountTomans: number;
  amountProviderUnits: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  methodSnapshot?: CustomerPaymentMethod;
  baleInvoiceStatus?: string;
}

export interface PaymentOptions {
  order: { id: string; orderNumber: string; totalTomans: number; paymentStatus: string };
  methods: CustomerPaymentMethod[];
  activeAttempt: CustomerPaymentAttempt | null;
  unavailableReason?: string;
}

export function loadAvailablePaymentMethods() {
  return api<{ methods: CustomerPaymentMethod[]; unavailableReason?: string }>('/v1/payment-methods/methods');
}

export interface CustomerPaymentStatus {
  attempt: CustomerPaymentAttempt;
  order: { id: string; orderNumber: string; paymentStatus: string; orderStatus: string };
  receipt: { id: string; reviewStatus: 'pending' | 'approved' | 'rejected'; uploadedAt: string; reviewNote: string | null } | null;
}

export function loadPaymentOptions(orderId: string) {
  return api<PaymentOptions>(`/v1/orders/${encodeURIComponent(orderId)}/payment-options`);
}

export function createCardPayment(orderId: string, idempotencyKey: string) {
  return api<{ attempt: CustomerPaymentAttempt; card: CustomerPaymentMethod }>(`/v1/orders/${encodeURIComponent(orderId)}/payments/card-to-card`, {
    method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({}),
  });
}

export function createBalePayment(orderId: string, idempotencyKey: string) {
  return api<{ attempt: CustomerPaymentAttempt; paymentUrl: string | null; invoiceStatus?: string }>(`/v1/orders/${encodeURIComponent(orderId)}/payments/bale`, {
    method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({}),
  });
}

export function loadPaymentStatus(attemptId: string) {
  return api<CustomerPaymentStatus>(`/v1/payments/${encodeURIComponent(attemptId)}/status`);
}

export function createBalePaymentLink(attemptId: string) {
  return api<{ paymentUrl: string | null; invoiceStatus: string }>(`/v1/payments/${encodeURIComponent(attemptId)}/bale/link`, {
    method: 'POST', body: JSON.stringify({}),
  });
}

export function uploadPaymentReceipt(attemptId: string, file: File) {
  const form = new FormData();
  form.append('receipt', file, file.name);
  return api<{ attempt: CustomerPaymentAttempt; receipt: CustomerPaymentStatus['receipt'] }>(`/v1/payments/${encodeURIComponent(attemptId)}/receipt`, {
    method: 'POST', body: form,
  });
}
