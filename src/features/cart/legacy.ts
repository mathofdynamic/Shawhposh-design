export function resolveLegacyCartVariant<T extends { id: string; sku: string }>(
  products: readonly { id: string; variants?: readonly T[] }[],
  item: { productId?: string; variantId?: string; sku?: string },
): T | undefined {
  const variants = products.find(product => product.id === item.productId)?.variants;
  if (!variants) return undefined;

  const byId = item.variantId && variants.find(variant => variant.id === item.variantId);
  if (byId) return byId;

  return item.sku ? variants.find(variant => variant.sku === item.sku) : undefined;
}
