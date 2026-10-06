import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLegacyCartVariant } from './legacy';

const products = [
  {
    id: 'product-a',
    variants: [
      { id: 'variant-a', sku: 'SKU-A', colorHex: '#111111', size: 'M' },
      { id: 'variant-b', sku: 'SKU-B', colorHex: '#111111', size: 'M' },
    ],
  },
  { id: 'product-b', variants: [{ id: 'variant-c', sku: 'SKU-C', colorHex: '#111111', size: 'M' }] },
];

test('legacy cart migration resolves exact variant IDs before SKU', () => {
  assert.equal(resolveLegacyCartVariant(products, { productId: 'product-a', variantId: 'variant-a', sku: 'SKU-B' })?.id, 'variant-a');
});

test('legacy cart migration falls back to SKU only within the matching product', () => {
  assert.equal(resolveLegacyCartVariant(products, { productId: 'product-a', variantId: 'stale-id', sku: 'SKU-B' })?.id, 'variant-b');
  assert.equal(resolveLegacyCartVariant(products, { productId: 'product-a', sku: 'SKU-C' }), undefined);
});

test('legacy cart migration does not guess a variant from color and size', () => {
  assert.equal(resolveLegacyCartVariant(products, { productId: 'product-a' }), undefined);
});
