import { api, patch, post } from '../../api/client';

export interface CustomerAddress {
  id: string;
  title: string | null;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  title?: string | null;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function loadAccount() {
  return api<{ user: CustomerProfile }>('/v1/account');
}

export async function updateAccount(input: { fullName?: string; phone?: string | null }) {
  return patch<{ user: CustomerProfile }>('/v1/account', input);
}

export async function loadAddresses() {
  return api<{ addresses: CustomerAddress[] }>('/v1/account/addresses');
}

export async function createAddress(input: AddressInput) {
  return post<{ address: CustomerAddress }>('/v1/account/addresses', input);
}

export async function updateAddress(id: string, input: Partial<AddressInput>) {
  return patch<{ address: CustomerAddress }>(`/v1/account/addresses/${encodeURIComponent(id)}`, input);
}

export async function deleteAddress(id: string) {
  return api<{ success: true }>(`/v1/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function loadCustomerOrders(page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return api<{ orders: Array<Record<string, unknown>>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(`/v1/account/orders?${query.toString()}`);
}
