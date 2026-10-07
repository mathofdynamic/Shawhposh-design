import { api } from '../../api/client';

export interface CheckoutConfiguration {
  orderSubmissionEnabled: boolean;
  reservationMinutes: number;
}

export interface ShippingMethodQuote {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceTomans: number;
  totalTomans: number;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
}

export interface CheckoutQuoteItem {
  cartItemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  colorName: string;
  colorHex: string;
  size: string;
  quantity: number;
  unitPriceTomans: number;
  lineTotalTomans: number;
  availableQuantity: number;
}

export type CheckoutQuoteItemSnapshot = Omit<CheckoutQuoteItem, 'availableQuantity'>;

export interface CheckoutQuote {
  items: CheckoutQuoteItem[];
  subtotalTomans: number;
  discountTomans: number;
  shippingMethods: ShippingMethodQuote[];
  currencyUnit: 'TOMAN';
}

export interface OrderSnapshot {
  id: string;
  orderNumber: string;
  shippingMethodId: string | null;
  shippingMethodCode: string | null;
  shippingMethodName: string | null;
  orderStatus: string;
  paymentStatus: string;
  subtotalTomans: number;
  discountTomans: number;
  shippingTomans: number;
  totalTomans: number;
}

export interface CheckoutOrderInput {
  addressId?: string;
  shippingAddress?: Record<string, string>;
  shippingMethodId: string;
  expectedQuote: { items: CheckoutQuoteItemSnapshot[]; subtotalTomans: number; discountTomans: number; shippingMethod: ShippingMethodQuote };
  customerNote?: string;
}

export async function loadCheckoutConfiguration() {
  return api<CheckoutConfiguration>('/v1/checkout/config');
}

export async function quoteCheckout(input: { addressId?: string; shippingAddress?: Record<string, string> }) {
  return api<CheckoutQuote>('/v1/checkout/quote', { method: 'POST', body: JSON.stringify(input) });
}

export async function createCheckoutOrder(input: CheckoutOrderInput, idempotencyKey: string) {
  return api<{ order: OrderSnapshot }>('/v1/checkout/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
}
