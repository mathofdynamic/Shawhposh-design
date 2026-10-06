import { createHash } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { cartItems, cartMigrations, carts, inventory, productMedia, productVariants, products } from '../../db/schema';
import { ApiError } from '../../lib/errors';

export const addCartItemSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) });
export const setCartQuantitySchema = z.object({ quantity: z.number().int().min(1).max(20) });
export const legacyCartMigrationSchema = z.object({
  items: z.array(addCartItemSchema).max(100),
}).superRefine(({ items }, ctx) => {
  if (new Set(items.map(item => item.variantId)).size !== items.length) {
    ctx.addIssue({ code: 'custom', message: 'سبد خرید قدیمی دارای اندازه تکراری است.', path: ['items'] });
  }
});

export function getOrCreateActiveCart(userId: string) {
  return db.transaction(tx => {
    const current = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get();
    if (current) return current;
    return tx.insert(carts).values({ userId, status: 'active' }).returning().get();
  }, { behavior: 'immediate' });
}

export function cartView(userId: string) {
  const cart = getOrCreateActiveCart(userId);
  const rows = db.select({ item: cartItems, variant: productVariants, product: products, stock: inventory })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(inventory, eq(productVariants.id, inventory.variantId))
    .where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt)).all();
  const items = rows.map(({ item, variant, product, stock }) => {
    const unitPriceTomans = variant.priceTomans ?? product.basePriceTomans;
    const availableQuantity = product.status === 'active' && variant.status === 'active'
      ? Math.max(0, (stock?.onHand ?? 0) - (stock?.reserved ?? 0)) : 0;
    const availabilityCode = product.status !== 'active' ? 'PRODUCT_INACTIVE'
      : variant.status !== 'active' ? 'VARIANT_INACTIVE'
      : availableQuantity < item.quantity ? (availableQuantity === 0 ? 'OUT_OF_STOCK' : 'QUANTITY_EXCEEDS_STOCK') : null;
    const image = db.select({ url: productMedia.url }).from(productMedia)
      .where(eq(productMedia.productId, product.id)).orderBy(asc(productMedia.displayOrder)).get()?.url ?? '';
    return {
      id: item.id, productId: product.id, productName: product.name, image,
      variantId: variant.id, sku: variant.sku, color: { name: variant.colorName, hex: variant.colorHex }, size: variant.size,
      quantity: item.quantity, price: unitPriceTomans, unitPriceTomans, lineTotalTomans: unitPriceTomans * item.quantity,
      availableQuantity, isAvailable: availabilityCode === null, availabilityCode,
    };
  });
  const subtotalTomans = items.reduce((total, item) => total + item.lineTotalTomans, 0);
  return { cart: { id: cart.id, items, subtotalTomans, totalItems: items.reduce((sum, item) => sum + item.quantity, 0), isValid: items.every(item => item.isAvailable) } };
}

function requirePurchasableVariant(variantId: string) {
  const variant = db.select().from(productVariants).where(eq(productVariants.id, variantId)).get();
  if (!variant) throw new ApiError(404, 'VARIANT_NOT_FOUND', 'این اندازه و رنگ در فروشگاه موجود نیست.');
  const product = db.select().from(products).where(eq(products.id, variant.productId)).get();
  if (!product || product.status !== 'active' || variant.status !== 'active') throw new ApiError(409, 'ITEM_UNAVAILABLE', 'این محصول یا اندازه دیگر فعال نیست.');
  const stock = db.select().from(inventory).where(eq(inventory.variantId, variant.id)).get();
  return { variant, product, available: Math.max(0, (stock?.onHand ?? 0) - (stock?.reserved ?? 0)) };
}

export function addCartItem(userId: string, input: unknown) {
  const body = addCartItemSchema.parse(input);
  db.transaction(tx => {
    const cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get()
      ?? tx.insert(carts).values({ userId, status: 'active' }).returning().get();
    const { variant, available } = requirePurchasableVariant(body.variantId);
    const existing = tx.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variant.id))).get();
    const quantity = (existing?.quantity ?? 0) + body.quantity;
    if (quantity > available) throw new ApiError(409, 'OUT_OF_STOCK', available === 0 ? 'این اندازه دیگر موجود نیست.' : `فقط ${available} عدد از این اندازه موجود است.`, { availableQuantity: available });
    if (existing) tx.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, existing.id)).run();
    else tx.insert(cartItems).values({ cartId: cart.id, variantId: variant.id, quantity }).run();
    tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id)).run();
    return cart.id;
  }, { behavior: 'immediate' });
  return cartView(userId);
}

export function migrateLegacyCart(userId: string, key: string, input: unknown) {
  const body = legacyCartMigrationSchema.parse(input);
  const normalized = [...body.items].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const payloadHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  const migration = db.transaction(tx => {
    const existingMigration = tx.select().from(cartMigrations)
      .where(and(eq(cartMigrations.userId, userId), eq(cartMigrations.key, key))).get();
    if (existingMigration) {
      if (existingMigration.payloadHash !== payloadHash) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'شناسه انتقال سبد با اطلاعات دیگری استفاده شده است.');
      return { result: existingMigration.result, replayed: true };
    }

    let cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get();
    if (!cart) cart = tx.insert(carts).values({ userId, status: 'active' }).returning().get();
    const rejected: Array<{ variantId: string; reason: string }> = [];
    let accepted = 0;

    for (const line of normalized) {
      const variant = tx.select().from(productVariants).where(eq(productVariants.id, line.variantId)).get();
      const product = variant ? tx.select().from(products).where(eq(products.id, variant.productId)).get() : undefined;
      if (!variant || !product) {
        rejected.push({ variantId: line.variantId, reason: 'VARIANT_NOT_FOUND' });
        continue;
      }
      if (product.status !== 'active' || variant.status !== 'active') {
        rejected.push({ variantId: line.variantId, reason: 'ITEM_UNAVAILABLE' });
        continue;
      }
      const stock = tx.select().from(inventory).where(eq(inventory.variantId, variant.id)).get();
      const available = Math.max(0, (stock?.onHand ?? 0) - (stock?.reserved ?? 0));
      const existingItem = tx.select().from(cartItems).where(and(eq(cartItems.cartId, cart!.id), eq(cartItems.variantId, variant.id))).get();
      const requested = (existingItem?.quantity ?? 0) + line.quantity;
      if (requested > available || requested > 20) {
        rejected.push({ variantId: line.variantId, reason: available === 0 ? 'OUT_OF_STOCK' : 'QUANTITY_EXCEEDS_STOCK' });
        continue;
      }
      if (existingItem) tx.update(cartItems).set({ quantity: requested, updatedAt: new Date() }).where(eq(cartItems.id, existingItem.id)).run();
      else tx.insert(cartItems).values({ cartId: cart.id, variantId: variant.id, quantity: line.quantity }).run();
      accepted += 1;
    }
    const result = { accepted, rejected };
    tx.insert(cartMigrations).values({ userId, key, payloadHash, result }).run();
    tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id)).run();
    return { result, replayed: false };
  }, { behavior: 'immediate' });
  return { migration: migration.result, replayed: migration.replayed, ...cartView(userId) };
}

export function updateCartItem(userId: string, itemId: string, input: unknown) {
  const { quantity } = setCartQuantitySchema.parse(input);
  db.transaction(tx => {
    const cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get()
      ?? tx.insert(carts).values({ userId, status: 'active' }).returning().get();
    const current = tx.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).get();
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'سبد خرید تغییر کرده است.');
    const { available } = requirePurchasableVariant(current.variantId);
    if (quantity > available) throw new ApiError(409, 'OUT_OF_STOCK', available === 0 ? 'این اندازه دیگر موجود نیست.' : `فقط ${available} عدد از این اندازه موجود است.`, { availableQuantity: available });
    tx.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, itemId)).run();
    tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id)).run();
  }, { behavior: 'immediate' });
  return cartView(userId);
}

export function removeCartItem(userId: string, itemId: string) {
  db.transaction(tx => {
    const cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get()
      ?? tx.insert(carts).values({ userId, status: 'active' }).returning().get();
    const deleted = tx.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).run();
    if (!deleted.changes) throw new ApiError(404, 'NOT_FOUND', 'کالای سبد خرید پیدا نشد.');
    tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id)).run();
  }, { behavior: 'immediate' });
  return cartView(userId);
}

export function clearCart(userId: string) {
  db.transaction(tx => {
    const cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get()
      ?? tx.insert(carts).values({ userId, status: 'active' }).returning().get();
    tx.delete(cartItems).where(eq(cartItems.cartId, cart.id)).run();
    tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id)).run();
  }, { behavior: 'immediate' });
  return cartView(userId);
}
