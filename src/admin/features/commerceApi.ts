import { api, patch, post } from '../../api/client';

export interface AdminOrder {
  id: string;
  customerId?: string | null;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: { recipientName: string; phone: string; province: string; city: string; addressLine: string; postalCode: string };
  shippingMethodId: string | null;
  shippingMethodCode: string | null;
  shippingMethodName: string | null;
  subtotalTomans: number;
  discountTomans: number;
  shippingTomans: number;
  totalTomans: number;
  orderStatus: string;
  paymentStatus: string;
  productionStatus: string;
  fulfillmentStatus: string;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  items: Array<{ id: string; productId: string; variantId: string; sku: string; productName: string; variant: { colorName: string; colorHex: string; size: string }; unitPriceTomans: number; quantity: number; lineTotalTomans: number }>;
  timeline: Array<{ type: string; previousValue?: string | null; newValue?: string | null; note?: string; createdAt: string }>;
}

export interface CommercePage<T> {
  rows: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function listAdminOrders(query: URLSearchParams) {
  return api<{ orders: AdminOrder[]; pagination: CommercePage<AdminOrder>['pagination'] }>(`/v1/admin/orders?${query.toString()}`);
}

export function getAdminOrder(id: string) {
  return api<{ order: AdminOrder }>(`/v1/admin/orders/${encodeURIComponent(id)}`);
}

export function cancelAdminOrder(id: string, reason: string) {
  return post<{ order: AdminOrder }>(`/v1/admin/orders/${encodeURIComponent(id)}/cancel`, { reason });
}

export function addAdminOrderNote(id: string, note: string) {
  return post<{ order: AdminOrder }>(`/v1/admin/orders/${encodeURIComponent(id)}/notes`, { note });
}

export function updateAdminOrderAddress(id: string, input: AdminOrder['shippingAddress'] & { reason: string }) {
  return patch<{ order: AdminOrder }>(`/v1/admin/orders/${encodeURIComponent(id)}/shipping-address`, input);
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  orderCount: number;
  lifetimeSpendTomans: number;
}

export interface AdminCustomerSummary {
  registeredCount: number;
  activeCount: number;
  customersWithOrdersCount: number;
  paidSpendTomans: number;
}

export function listAdminCustomers(query: URLSearchParams) {
  return api<{ customers: AdminCustomer[]; summary: AdminCustomerSummary; pagination: CommercePage<AdminCustomer>['pagination'] }>(`/v1/admin/customers?${query.toString()}`);
}

export function getAdminCustomer(id: string) {
  return api<{ customer: AdminCustomer & { updatedAt: string }; addresses: Array<AdminOrder['shippingAddress'] & { id: string; title: string | null; isDefault: boolean }>; orders: AdminOrder[]; supportHistoryAvailable: boolean }>(`/v1/admin/customers/${encodeURIComponent(id)}`);
}
