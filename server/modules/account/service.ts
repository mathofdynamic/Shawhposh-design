import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { customerAddresses, orderEvents, orderItems, orders, users } from '../../db/schema';
import { ApiError } from '../../lib/errors';
import { normalizePhone } from '../auth/service';

const normalizeDigits = (value: string) => value
  .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
  .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660));

const addressFields = {
  title: z.string().trim().max(60).nullable().optional(),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(30).transform(normalizePhone),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  addressLine: z.string().trim().min(8).max(500),
  postalCode: z.string().trim().transform(normalizeDigits).refine(value => /^\d{10}$/.test(value), 'کد پستی باید ۱۰ رقم باشد.'),
  isDefault: z.boolean().optional(),
};
export const createAddressSchema = z.object(addressFields);
export const updateAddressSchema = z.object({
  title: addressFields.title,
  recipientName: addressFields.recipientName.optional(),
  phone: addressFields.phone.optional(),
  province: addressFields.province.optional(),
  city: addressFields.city.optional(),
  addressLine: addressFields.addressLine.optional(),
  postalCode: addressFields.postalCode.optional(),
  isDefault: addressFields.isDefault,
}).refine(value => Object.keys(value).length > 0);

export const updateAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(10).max(30).transform(normalizePhone).nullable().optional(),
}).refine(value => Object.keys(value).length > 0);

export function accountProfile(userId: string) {
  const user = db.select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status, createdAt: users.createdAt, updatedAt: users.updatedAt })
    .from(users).where(eq(users.id, userId)).get();
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'حساب کاربری پیدا نشد.');
  return { user: { id: user.id, name: user.fullName, email: user.email, phone: user.phone, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt } };
}

export function updateAccount(userId: string, input: unknown) {
  const body = updateAccountSchema.parse(input);
  const updated = db.transaction(tx => {
    const current = tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();
    if (!current) return undefined;
    if (body.phone === null && current.email === null) {
      throw new ApiError(422, 'IDENTITY_REQUIRED', 'حداقل یک ایمیل یا شماره تلفن باید برای ورود حفظ شود.');
    }
    return tx.update(users).set({ ...body, updatedAt: new Date() }).where(eq(users.id, userId))
      .returning({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status, createdAt: users.createdAt, updatedAt: users.updatedAt }).get();
  }, { behavior: 'immediate' });
  if (!updated) throw new ApiError(404, 'NOT_FOUND', 'حساب کاربری پیدا نشد.');
  return { user: { id: updated.id, name: updated.fullName, email: updated.email, phone: updated.phone, status: updated.status, createdAt: updated.createdAt, updatedAt: updated.updatedAt } };
}

export function listAddresses(userId: string) {
  return { addresses: db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId))
    .orderBy(desc(customerAddresses.isDefault), asc(customerAddresses.createdAt)).all() };
}

export function createAddress(userId: string, input: unknown) {
  const body = createAddressSchema.parse(input);
  return db.transaction(tx => {
    const current = tx.select({ id: customerAddresses.id }).from(customerAddresses).where(eq(customerAddresses.userId, userId)).all();
    const isDefault = body.isDefault ?? current.length === 0;
    if (isDefault) tx.update(customerAddresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(customerAddresses.userId, userId)).run();
    const address = tx.insert(customerAddresses).values({
      title: body.title ?? null,
      recipientName: body.recipientName!,
      phone: body.phone!,
      province: body.province!,
      city: body.city!,
      addressLine: body.addressLine!,
      postalCode: body.postalCode!,
      isDefault,
      userId,
    }).returning().get();
    return { address };
  }, { behavior: 'immediate' });
}

export function updateAddress(userId: string, addressId: string, input: unknown) {
  const body = updateAddressSchema.parse(input);
  return db.transaction(tx => {
    const current = tx.select().from(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId))).get();
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'نشانی پیدا نشد.');
    if (body.isDefault === true) tx.update(customerAddresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(customerAddresses.userId, userId)).run();
    const { isDefault, ...fields } = body;
    const address = tx.update(customerAddresses).set({ ...fields, ...(isDefault === undefined ? {} : { isDefault }), updatedAt: new Date() })
      .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId))).returning().get();
    if (isDefault === false && current.isDefault) {
      const next = tx.select({ id: customerAddresses.id }).from(customerAddresses).where(and(eq(customerAddresses.userId, userId), ne(customerAddresses.id, addressId))).orderBy(asc(customerAddresses.createdAt)).get();
      if (next) tx.update(customerAddresses).set({ isDefault: true, updatedAt: new Date() }).where(eq(customerAddresses.id, next.id)).run();
    }
    return { address };
  }, { behavior: 'immediate' });
}

export function deleteAddress(userId: string, addressId: string) {
  return db.transaction(tx => {
    const current = tx.select().from(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId))).get();
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'نشانی پیدا نشد.');
    tx.delete(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId))).run();
    if (current.isDefault) {
      const next = tx.select({ id: customerAddresses.id }).from(customerAddresses).where(eq(customerAddresses.userId, userId)).orderBy(asc(customerAddresses.createdAt)).get();
      if (next) tx.update(customerAddresses).set({ isDefault: true, updatedAt: new Date() }).where(eq(customerAddresses.id, next.id)).run();
    }
    return { success: true };
  }, { behavior: 'immediate' });
}

export function orderDto(order: typeof orders.$inferSelect, includeInternal = false) {
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all();
  const events = db.select().from(orderEvents).where(and(
    eq(orderEvents.orderId, order.id),
    ...(includeInternal ? [] : [sql`${orderEvents.eventType} in ('order_created','order_cancelled','reservation_released')`]),
  )).orderBy(asc(orderEvents.createdAt)).all();
    return {
      id: order.id, orderNumber: order.orderNumber, ...(includeInternal ? { customerId: order.userId } : {}),
      customerName: order.customerName, customerEmail: order.customerEmail,
    customerPhone: order.customerPhone, shippingAddress: order.shippingAddressSnapshot,
    shippingMethodId: order.shippingMethodId, shippingMethodCode: order.shippingMethodCode, shippingMethodName: order.shippingMethodName,
    subtotalTomans: order.subtotalTomans, discountTomans: order.discountTomans, shippingTomans: order.shippingTomans,
    totalTomans: order.totalTomans, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus,
    productionStatus: order.productionStatus, fulfillmentStatus: order.fulfillmentStatus, customerNote: order.customerNote,
    createdAt: order.createdAt, updatedAt: order.updatedAt, cancelledAt: order.cancelledAt,
    items: items.map(item => ({ id: item.id, productId: item.productId, variantId: item.variantId, sku: item.skuSnapshot,
      productName: item.productNameSnapshot, variant: item.variantSnapshot, unitPriceTomans: item.unitPriceTomans,
      quantity: item.quantity, lineTotalTomans: item.lineTotalTomans })),
    timeline: events.map(event => ({ type: event.eventType, previousValue: event.previousValue, newValue: event.newValue, note: includeInternal ? event.note : undefined, createdAt: event.createdAt })),
  };
}

export function listCustomerOrders(userId: string, page = 1, pageSize = 20) {
  const count = db.select({ total: sql<number>`count(*)` }).from(orders).where(eq(orders.userId, userId)).get()!;
  const rows = db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(pageSize).offset((page - 1) * pageSize).all();
  return { orders: rows.map(row => orderDto(row)), pagination: { page, pageSize, total: count.total, totalPages: Math.ceil(count.total / pageSize) } };
}

export function getCustomerOrder(userId: string, orderId: string) {
  const order = db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).get();
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
  return { order: orderDto(order) };
}

export function findDefaultAddress(userId: string) {
  return db.select().from(customerAddresses).where(and(eq(customerAddresses.userId, userId), eq(customerAddresses.isDefault, true))).get();
}

export const addressIdSchema = z.string().uuid();
