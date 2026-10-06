import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDemoProductImage, PRODUCT_IMAGE_FALLBACK, storefrontProductImage, storefrontProductImages } from './productImage';

test('storefront hides seeded random Picsum photos but preserves real product media', () => {
  const demoImages = [
    'https://picsum.photos/seed/shirt-front/800/800',
    'https://PICSUM.photos/seed/shirt-back/800/800',
  ];

  assert.equal(isDemoProductImage(demoImages[0]), true);
  assert.equal(storefrontProductImage(demoImages[0]), PRODUCT_IMAGE_FALLBACK);
  assert.deepEqual(storefrontProductImages(demoImages), [PRODUCT_IMAGE_FALLBACK]);
  assert.deepEqual(storefrontProductImages([...demoImages, '/media/product-front.webp']), ['/media/product-front.webp']);
  assert.equal(storefrontProductImage('https://cdn.example.com/product-front.webp'), 'https://cdn.example.com/product-front.webp');
});
