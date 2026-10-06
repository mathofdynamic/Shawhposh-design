import { api } from '../../api/client';

export interface CheckoutConfiguration {
  orderSubmissionEnabled: boolean;
  shippingConfigured: boolean;
  shippingTomans: number | null;
  reservationMinutes: number;
}

export interface OrderSnapshot {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  subtotalTomans: number;
  discountTomans: number;
  shippingTomans: number;
  totalTomans: number;
}

export async function loadCheckoutConfiguration() {
  return api<CheckoutConfiguration>('/v1/checkout/config');
}

export async function createCheckoutOrder(input: { addressId?: string; shippingAddress?: Record<string, string>; customerNote?: string }, idempotencyKey: string) {
  return api<{ order: OrderSnapshot }>('/v1/checkout/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
}
