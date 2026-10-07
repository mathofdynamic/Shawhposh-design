import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { carts, cartItems, customerAddresses, inventory, productVariants, products, shippingMethods } from '../../db/schema';
import { ApiError } from '../../lib/errors';
import { createAddressSchema } from '../account/service';

const money = z.number().int().min(0).max(1_000_000_000);
const days = z.number().int().min(1).max(365);
const codeSchema = z.string().trim().toLowerCase().min(2).max(48).regex(/^[a-z0-9][a-z0-9_-]*$/);

const shippingMethodFieldsSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  fixedPriceTomans: money.nullable(),
  freeShippingThresholdTomans: money.nullable().optional(),
  estimatedMinDays: days.nullable().optional(),
  estimatedMaxDays: days.nullable().optional(),
  active: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
});

export const shippingMethodWriteSchema = shippingMethodFieldsSchema.superRefine((method, context) => {
  if (method.active && method.fixedPriceTomans === null) {
    context.addIssue({ code: 'custom', path: ['fixedPriceTomans'], message: 'برای فعال‌کردن روش ارسال، هزینه ثابت را وارد کنید.' });
  }
  if ((method.estimatedMinDays == null) !== (method.estimatedMaxDays == null)) {
    context.addIssue({ code: 'custom', path: ['estimatedMaxDays'], message: 'هر دو روز بازه تحویل را وارد کنید.' });
  }
  if (method.estimatedMinDays != null && method.estimatedMaxDays != null && method.estimatedMaxDays < method.estimatedMinDays) {
    context.addIssue({ code: 'custom', path: ['estimatedMaxDays'], message: 'حداکثر روز باید برابر یا بیشتر از حداقل روز باشد.' });
  }
});

const shippingMethodPatchSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  fixedPriceTomans: money.nullable().optional(),
  freeShippingThresholdTomans: money.nullable().optional(),
  estimatedMinDays: days.nullable().optional(),
  estimatedMaxDays: days.nullable().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
}).refine(value => Object.keys(value).length > 0);
const quoteRequestSchema = z.object({
  addressId: z.string().uuid().optional(),
  shippingAddress: createAddressSchema.optional(),
}).refine(value => (value.addressId !== undefined) !== (value.shippingAddress !== undefined));

export type ShippingMethodRow = typeof shippingMethods.$inferSelect;

export function calculateShippingTomans(method: Pick<ShippingMethodRow, 'pricingType' | 'fixedPriceTomans' | 'freeShippingThresholdTomans'>, subtotalTomans: number) {
  if (method.pricingType !== 'fixed' || method.fixedPriceTomans === null) {
    throw new ApiError(503, 'SHIPPING_METHOD_UNAVAILABLE', 'در حال حاضر روش ارسال فعالی برای ثبت سفارش وجود ندارد.');
  }
  if (method.freeShippingThresholdTomans !== null && subtotalTomans >= method.freeShippingThresholdTomans) return 0;
  return method.fixedPriceTomans;
}

function customerShippingMethod(method: ShippingMethodRow, subtotalTomans: number) {
  const priceTomans = calculateShippingTomans(method, subtotalTomans);
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    description: method.description,
    priceTomans,
    estimatedMinDays: method.estimatedMinDays,
    estimatedMaxDays: method.estimatedMaxDays,
  };
}

function publicMethodList() {
  return db.select().from(shippingMethods).where(eq(shippingMethods.active, true))
    .orderBy(asc(shippingMethods.displayOrder), asc(shippingMethods.createdAt)).all()
    .filter(method => method.pricingType === 'fixed' && method.fixedPriceTomans !== null);
}

export function listPublicShippingMethods() {
  return { shippingMethods: publicMethodList().map(method => ({
    id: method.id,
    code: method.code,
    name: method.name,
    description: method.description,
    fixedPriceTomans: method.fixedPriceTomans,
    freeShippingThresholdTomans: method.freeShippingThresholdTomans,
    estimatedMinDays: method.estimatedMinDays,
    estimatedMaxDays: method.estimatedMaxDays,
  })) };
}

export function checkoutAvailability(reservationMinutes: number) {
  return { orderSubmissionEnabled: publicMethodList().length > 0, reservationMinutes };
}

export function listAdminShippingMethods() {
  const rows = db.select().from(shippingMethods).orderBy(asc(shippingMethods.displayOrder), asc(shippingMethods.createdAt)).all();
  return { shippingMethods: rows };
}

export function createShippingMethod(input: unknown) {
  const body = shippingMethodWriteSchema.parse(input);
  const method = db.insert(shippingMethods).values({
    code: body.code,
    name: body.name,
    description: body.description?.trim() || null,
    carrierType: 'manual',
    pricingType: 'fixed',
    fixedPriceTomans: body.fixedPriceTomans,
    freeShippingThresholdTomans: body.freeShippingThresholdTomans ?? null,
    estimatedMinDays: body.estimatedMinDays ?? null,
    estimatedMaxDays: body.estimatedMaxDays ?? null,
    active: body.active,
    displayOrder: body.displayOrder,
  }).returning().get();
  return { shippingMethod: method };
}

export function updateShippingMethod(id: string, input: unknown) {
  const patch = shippingMethodPatchSchema.parse(input);
  const current = db.select().from(shippingMethods).where(eq(shippingMethods.id, id)).get();
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'روش ارسال پیدا نشد.');
  const next = shippingMethodWriteSchema.parse({ ...current, ...patch });
  const method = db.update(shippingMethods).set({
    code: next.code,
    name: next.name,
    description: next.description?.trim() || null,
    fixedPriceTomans: next.fixedPriceTomans,
    freeShippingThresholdTomans: next.freeShippingThresholdTomans ?? null,
    estimatedMinDays: next.estimatedMinDays ?? null,
    estimatedMaxDays: next.estimatedMaxDays ?? null,
    active: next.active,
    displayOrder: next.displayOrder,
    updatedAt: new Date(),
  }).where(eq(shippingMethods.id, id)).returning().get();
  return { shippingMethod: method };
}

function addressForQuote(userId: string, input: z.infer<typeof quoteRequestSchema>) {
  if (input.addressId) {
    const stored = db.select().from(customerAddresses)
      .where(and(eq(customerAddresses.id, input.addressId), eq(customerAddresses.userId, userId))).get();
    if (!stored) throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'نشانی انتخاب‌شده پیدا نشد.');
    return createAddressSchema.parse(stored);
  }
  return createAddressSchema.parse(input.shippingAddress);
}

export function quoteCheckout(userId: string, input: unknown) {
  const body = quoteRequestSchema.parse(input);
  addressForQuote(userId, body);
  const cart = db.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get();
  if (!cart) throw new ApiError(409, 'CART_EMPTY', 'سبد خرید خالی است.');
  const lines = db.select({ item: cartItems, variant: productVariants, product: products, stock: inventory })
    .from(cartItems).innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id)).leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt)).all();
  if (!lines.length) throw new ApiError(409, 'CART_EMPTY', 'سبد خرید خالی است.');

  const items = lines.map(({ item, variant, product, stock }) => {
    if (product.status !== 'active' || variant.status !== 'active') throw new ApiError(409, 'ITEM_UNAVAILABLE', 'یکی از کالاهای سبد دیگر فعال نیست.');
    const available = (stock?.onHand ?? 0) - (stock?.reserved ?? 0);
    if (available < item.quantity) {
      throw new ApiError(409, 'OUT_OF_STOCK', available <= 0 ? 'یکی از کالاهای سبد دیگر موجود نیست.' : `فقط ${available} عدد از یکی از کالاها موجود است.`, { sku: variant.sku, availableQuantity: Math.max(0, available) });
    }
    const unitPriceTomans = variant.priceTomans ?? product.basePriceTomans;
    const lineTotalTomans = unitPriceTomans * item.quantity;
    if (!Number.isSafeInteger(lineTotalTomans) || unitPriceTomans < 0) throw new ApiError(409, 'PRICE_INVALID', 'قیمت یکی از کالاها قابل محاسبه نیست.');
    return {
      cartItemId: item.id,
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      size: variant.size,
      quantity: item.quantity,
      unitPriceTomans,
      lineTotalTomans,
      availableQuantity: Math.max(0, available),
    };
  });
  const subtotalTomans = items.reduce((subtotal, item) => subtotal + item.lineTotalTomans, 0);
  if (!Number.isSafeInteger(subtotalTomans)) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مبلغ سبد بیش از حد مجاز است.');

  const discountTomans = 0;
  const methods = publicMethodList().map(method => {
    const publicMethod = customerShippingMethod(method, subtotalTomans);
    const totalTomans = subtotalTomans - discountTomans + publicMethod.priceTomans;
    if (!Number.isSafeInteger(totalTomans)) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مبلغ سفارش بیش از حد مجاز است.');
    return { ...publicMethod, totalTomans };
  });
  return { items, subtotalTomans, discountTomans, shippingMethods: methods, currencyUnit: 'TOMAN' as const };
}
