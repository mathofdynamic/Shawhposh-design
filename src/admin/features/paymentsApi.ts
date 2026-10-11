import { api, patch, post } from '../../api/client';

export type PaymentMethod = 'card_to_card' | 'bale_wallet';
export type PaymentStatus = 'created' | 'awaiting_customer' | 'pending_verification' | 'verified' | 'rejected' | 'failed' | 'expired';

export interface AdminPaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customer: { id: string | null; name: string; email: string | null; phone: string | null };
  method: PaymentMethod;
  status: PaymentStatus;
  amountTomans: number;
  amountProviderUnits: number | null;
  externalTransactionId: string | null;
  externalProviderReference: string | null;
  providerPayloadReference: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  orderPaymentStatus: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  paidAt: string | null;
}

export interface AdminPaymentSettings {
  methods: {
    card_to_card: {
      enabled: boolean;
      configured: boolean;
      bankName: string | null;
      cardholderName: string | null;
      cardNumber: string | null;
      accountIban: string | null;
      instructions: string | null;
      manualReviewMessage: string | null;
      manualReviewHoldHours: number | null;
    };
    bale_wallet: { enabled: boolean; configured: boolean; botUsername: string | null };
  };
}

export async function listPayments(query: URLSearchParams) {
  return api<{ payments: AdminPaymentRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(`/v1/admin/payments?${query}`);
}

export function getPayment(id: string) {
  return api<{ payment: AdminPaymentRow & {
    methodSnapshot: Record<string, unknown>;
    order: { id: string; orderNumber: string; totalTomans: number; orderStatus: string; paymentStatus: string; fulfillmentStatus: string;
      recipientName: string; recipientPhone: string; shippingAddress: Record<string, string>; items: Array<Record<string, unknown>> };
    bale: { chatId: string | null; invoiceMessageId: string | null; invoiceStatus: string; payloadReference: string | null } | null;
    receipts: Array<{ id: string; mimeType: string; sizeBytes: number; sha256: string; width: number | null; height: number | null;
      uploadedAt: string; reviewStatus: string; reviewedAt: string | null; reviewedByStaffId: string | null; reviewNote: string | null; url: string }>;
    timeline: Array<{ eventType: string; source: string; metadata: Record<string, unknown> | null; createdAt: string }>;
  } }>(`/v1/admin/payments/${encodeURIComponent(id)}`);
}

export function approvePayment(id: string) {
  return post(`/v1/admin/payments/${encodeURIComponent(id)}/manual-approve`, { acknowledged: true });
}

export function rejectPayment(id: string, reason: string) {
  return post(`/v1/admin/payments/${encodeURIComponent(id)}/manual-reject`, { reason });
}

export function reverifyBalePayment(id: string) {
  return post<{ verified: boolean; idempotent: boolean; safeCode?: string }>(`/v1/admin/payments/${encodeURIComponent(id)}/bale/reverify`, {});
}

export function loadPaymentSettings() {
  return api<AdminPaymentSettings>('/v1/admin/payments/settings');
}

export function saveCardPaymentSettings(input: Partial<AdminPaymentSettings['methods']['card_to_card']>) {
  return patch<AdminPaymentSettings>('/v1/admin/payments/settings/card-to-card', input);
}

export function saveBalePaymentSettings(enabled: boolean) {
  return patch<AdminPaymentSettings>('/v1/admin/payments/settings/bale-wallet', { enabled });
}
