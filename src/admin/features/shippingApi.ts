import { api, patch, post } from '../../api/client';

export interface AdminShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  pricingType: 'fixed';
  fixedPriceTomans: number | null;
  freeShippingThresholdTomans: number | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingMethodInput {
  code: string;
  name: string;
  description: string | null;
  fixedPriceTomans: number | null;
  freeShippingThresholdTomans: number | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  active: boolean;
  displayOrder: number;
}

export function listAdminShippingMethods() {
  return api<{ shippingMethods: AdminShippingMethod[] }>('/v1/admin/shipping/methods');
}

export function createAdminShippingMethod(input: ShippingMethodInput) {
  return post<{ shippingMethod: AdminShippingMethod }>('/v1/admin/shipping/methods', input);
}

export function updateAdminShippingMethod(id: string, input: ShippingMethodInput) {
  return patch<{ shippingMethod: AdminShippingMethod }>(`/v1/admin/shipping/methods/${encodeURIComponent(id)}`, input);
}
