import type { SyntheticEvent } from 'react';

export const PRODUCT_IMAGE_FALLBACK = '/product-image-unavailable.svg';

export function isDemoProductImage(source: string | null | undefined) {
  if (!source) return false;
  try {
    return new URL(source).hostname.toLowerCase() === 'picsum.photos';
  } catch {
    return false;
  }
}

export function storefrontProductImages(sources: string[] | null | undefined) {
  const actualImages = (sources ?? []).filter(source => Boolean(source) && !isDemoProductImage(source));
  return actualImages.length ? actualImages : [PRODUCT_IMAGE_FALLBACK];
}

export function storefrontProductImage(source: string | null | undefined) {
  return !source || isDemoProductImage(source) ? PRODUCT_IMAGE_FALLBACK : source;
}

export function handleProductImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true') return;
  image.dataset.fallbackApplied = 'true';
  image.src = PRODUCT_IMAGE_FALLBACK;
  image.alt = 'تصویر واقعی محصول ثبت نشده است';
}
