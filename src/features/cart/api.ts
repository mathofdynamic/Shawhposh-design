import { api, patch, post } from '../../api/client';
import type { CartItem } from '../../types';

export interface ServerCartItem extends CartItem {
  unitPriceTomans: number;
  lineTotalTomans: number;
  availableQuantity: number;
  availabilityCode: string | null;
}

export interface ServerCart {
  id: string;
  items: ServerCartItem[];
  subtotalTomans: number;
  totalItems: number;
  isValid: boolean;
}

export async function loadCart() {
  return api<{ cart: ServerCart }>('/v1/cart');
}

export async function addVariantToCart(variantId: string, quantity: number) {
  return post<{ cart: ServerCart }>('/v1/cart/items', { variantId, quantity });
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  return patch<{ cart: ServerCart }>(`/v1/cart/items/${encodeURIComponent(itemId)}`, { quantity });
}

export async function removeCartLine(itemId: string) {
  return api<{ cart: ServerCart }>(`/v1/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export async function clearServerCart() {
  return api<{ cart: ServerCart }>('/v1/cart', { method: 'DELETE' });
}

export async function migrateLegacyCart(items: Array<{ variantId: string; quantity: number }>, idempotencyKey: string) {
  return api<{ cart: ServerCart; migration: { accepted: number; rejected: Array<{ variantId: string; reason: string }> }; replayed: boolean }>('/v1/cart/migrations', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ items }),
  });
}

export function cartItemsForStorefront(cart: ServerCart): CartItem[] {
  return cart.items.map(item => ({ ...item, price: item.unitPriceTomans }));
}
