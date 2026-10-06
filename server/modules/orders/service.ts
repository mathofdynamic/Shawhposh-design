import { createHash } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db/connection';
import {
  carts, cartItems, checkoutIdempotency, customerAddresses, inventory, inventoryReservations,
  orderEvents, orderItems, orderSequences, orders, productMedia, productVariants, products,
  stockMovements, users,
} from '../../db/schema';
import { ApiError } from '../../lib/errors';
import { createAddressSchema, orderDto } from '../account/service';

const checkoutSchema = z.object({
  addressId: z.string().uuid().optional(),
  shippingAddress: createAddressSchema.optional(),
  customerNote: z.string().trim().max(1000).optional(),
}).refine(value => (value.addressId !== undefined) !== (value.shippingAddress !== undefined), 'انتخاب یک نشانی لازم است.');
const keySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const cancelSchema = z.object({ reason: z.string().trim().min(3).max(1000) });
const noteSchema = z.object({ note: z.string().trim().min(2).max(2000) });
const addressChangeSchema = z.object({ ...createAddressSchema.shape, reason: z.string().trim().min(3).max(1000) });

function containsLiteral(column: SQLWrapper, search: string): SQL {
  const escaped = search.replace(/[\\%_]/g, character => `\\${character}`);
  return sql`${column} LIKE ${`%${escaped}%`} ESCAPE '\\'`;
}

export function checkoutAvailability() {
  const shippingTomans = config.SHIPPING_COST_TOMANS ?? null;
  return { orderSubmissionEnabled: shippingTomans !== null, shippingConfigured: shippingTomans !== null,
    shippingTomans, reservationMinutes: config.CHECKOUT_RESERVATION_MINUTES };
}

function orderPeriod(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addressSnapshot(address: { title?: string | null; recipientName?: string; phone?: string; province?: string; city?: string; addressLine?: string; postalCode?: string }) {
  if (!address.recipientName || !address.phone || !address.province || !address.city || !address.addressLine || !address.postalCode) {
    throw new ApiError(422, 'ADDRESS_INVALID', 'اطلاعات نشانی کامل نیست.');
  }
  return { title: address.title ?? '', recipientName: address.recipientName, phone: address.phone, province: address.province,
    city: address.city, addressLine: address.addressLine, postalCode: address.postalCode };
}

export function createCheckoutOrder(userId: string, idempotencyKeyInput: unknown, input: unknown) {
  const key = keySchema.parse(idempotencyKeyInput);
  const body = checkoutSchema.parse(input);
  const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.CHECKOUT_RESERVATION_MINUTES * 60_000);

  const result = db.transaction(tx => {
    const prior = tx.select().from(checkoutIdempotency).where(and(eq(checkoutIdempotency.userId, userId), eq(checkoutIdempotency.key, key))).get();
    if (prior) {
      if (prior.requestHash !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'این شناسه قبلاً برای اطلاعات دیگری استفاده شده است.');
      const existingOrder = tx.select().from(orders).where(eq(orders.id, prior.orderId)).get();
      if (!existingOrder) throw new ApiError(409, 'IDEMPOTENCY_STATE_INVALID', 'وضعیت ثبت سفارش نیازمند بررسی است.');
      return { order: orderDto(existingOrder), replayed: true };
    }

    if (config.SHIPPING_COST_TOMANS === undefined) throw new ApiError(503, 'SHIPPING_NOT_CONFIGURED', 'ثبت سفارش تا تعیین هزینه ارسال فعال نمی‌شود.');
    const user = tx.select().from(users).where(eq(users.id, userId)).get();
    if (!user || user.status !== 'active') throw new ApiError(401, 'UNAUTHENTICATED', 'برای ثبت سفارش دوباره وارد حساب کاربری شوید.');
    const address = body.addressId
      ? tx.select().from(customerAddresses).where(and(eq(customerAddresses.id, body.addressId), eq(customerAddresses.userId, userId))).get()
      : body.shippingAddress;
    if (!address) throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'نشانی انتخاب‌شده پیدا نشد.');
    const shippingAddress = addressSnapshot(address);

    const cart = tx.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.status, 'active'))).get();
    if (!cart) throw new ApiError(409, 'CART_EMPTY', 'سبد خرید خالی است.');
    const lines = tx.select({ item: cartItems, variant: productVariants, product: products, stock: inventory })
      .from(cartItems).innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id)).leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt)).all();
    if (!lines.length) throw new ApiError(409, 'CART_EMPTY', 'سبد خرید خالی است.');

    const priced = lines.map(({ item, variant, product, stock }) => {
      if (product.status !== 'active' || variant.status !== 'active') throw new ApiError(409, 'ITEM_UNAVAILABLE', 'یکی از کالاهای سبد دیگر فعال نیست.');
      const available = (stock?.onHand ?? 0) - (stock?.reserved ?? 0);
      if (available < item.quantity) throw new ApiError(409, 'OUT_OF_STOCK', available <= 0 ? 'یکی از اندازه‌های سبد دیگر موجود نیست.' : `فقط ${available} عدد از یکی از اندازه‌ها موجود است.`, { sku: variant.sku, availableQuantity: Math.max(0, available) });
      const unitPriceTomans = variant.priceTomans ?? product.basePriceTomans;
      const lineTotalTomans = unitPriceTomans * item.quantity;
      if (!Number.isSafeInteger(lineTotalTomans) || unitPriceTomans < 0) throw new ApiError(409, 'PRICE_INVALID', 'قیمت یکی از کالاها قابل محاسبه نیست.');
      const image = tx.select({ url: productMedia.url }).from(productMedia).where(eq(productMedia.productId, product.id)).orderBy(asc(productMedia.displayOrder)).get()?.url ?? '';
      return { item, variant, product, stock, unitPriceTomans, lineTotalTomans, image };
    });
    const subtotalTomans = priced.reduce((sum, line) => sum + line.lineTotalTomans, 0);
    const shippingTomans = config.SHIPPING_COST_TOMANS;
    const totalTomans = subtotalTomans + shippingTomans;
    if (!Number.isSafeInteger(totalTomans)) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مبلغ سفارش بیش از حد مجاز است.');

    const period = orderPeriod(now);
    const sequence = tx.insert(orderSequences).values({ period, value: 1 })
      .onConflictDoUpdate({ target: orderSequences.period, set: { value: sql`${orderSequences.value} + 1` } })
      .returning({ value: orderSequences.value }).get();
    const orderNumber = `SHP-${period}-${String(sequence.value).padStart(6, '0')}`;
    const order = tx.insert(orders).values({ orderNumber, userId, customerEmail: user.email, customerPhone: shippingAddress.phone,
      customerName: shippingAddress.recipientName, shippingAddressSnapshot: shippingAddress, subtotalTomans,
      discountTomans: 0, shippingTomans, totalTomans, orderStatus: 'awaiting_payment', paymentStatus: 'unpaid',
      productionStatus: 'not_required', fulfillmentStatus: 'unfulfilled', customerNote: body.customerNote ?? null,
      createdAt: now, updatedAt: now }).returning().get();

    for (const line of priced) {
      tx.insert(orderItems).values({ orderId: order.id, productId: line.product.id, variantId: line.variant.id,
        skuSnapshot: line.variant.sku, productNameSnapshot: line.product.name,
        variantSnapshot: { colorName: line.variant.colorName, colorHex: line.variant.colorHex, size: line.variant.size },
        unitPriceTomans: line.unitPriceTomans, quantity: line.item.quantity, lineTotalTomans: line.lineTotalTomans,
      }).run();
      const reserved = tx.update(inventory).set({ reserved: sql`${inventory.reserved} + ${line.item.quantity}`, updatedAt: now })
        .where(and(eq(inventory.variantId, line.variant.id), sql`${inventory.onHand} - ${inventory.reserved} >= ${line.item.quantity}`)).run();
      if (!reserved.changes) throw new ApiError(409, 'OUT_OF_STOCK', 'موجودی هنگام ثبت سفارش تغییر کرد. سبد خرید را دوباره بررسی کنید.', { sku: line.variant.sku });
      tx.insert(inventoryReservations).values({ orderId: order.id, variantId: line.variant.id, quantity: line.item.quantity, status: 'active', expiresAt }).run();
      tx.insert(stockMovements).values({ variantId: line.variant.id, movementType: 'reservation', quantityDelta: 0,
        onHandBefore: line.stock?.onHand ?? 0, onHandAfter: line.stock?.onHand ?? 0,
        referenceType: 'order', referenceId: order.id, reason: `Reservation ${order.orderNumber}`, actorStaffId: null }).run();
      tx.insert(orderEvents).values({ orderId: order.id, eventType: 'inventory_reserved', actorType: 'system',
        note: 'موجودی برای سفارش رزرو شد.', metadata: { sku: line.variant.sku, quantity: line.item.quantity }, createdAt: now }).run();
    }
    tx.insert(orderEvents).values({ orderId: order.id, eventType: 'order_created', actorType: 'customer', actorUserId: userId,
      newValue: 'awaiting_payment', note: 'سفارش ثبت شد و در انتظار پرداخت است.', createdAt: now }).run();
    tx.update(carts).set({ status: 'converted', updatedAt: now }).where(eq(carts.id, cart.id)).run();
    tx.insert(checkoutIdempotency).values({ userId, key, requestHash: fingerprint, orderId: order.id, createdAt: now }).run();
    return { order: orderDto(order), replayed: false };
  }, { behavior: 'immediate' });
  return result;
}

export function adminOrderList(query: unknown) {
  const filters = z.object({ search: z.string().trim().max(200).optional(), status: z.enum(['draft','awaiting_payment','confirmed','cancelled','completed']).optional(),
    paymentStatus: z.enum(['unpaid','pending','paid','failed','partially_refunded','refunded']).optional(),
    dateFrom: z.string().refine(isCalendarDate, 'Expected a valid YYYY-MM-DD business date').optional(),
    dateTo: z.string().refine(isCalendarDate, 'Expected a valid YYYY-MM-DD business date').optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }).superRefine((value, context) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['dateTo'], message: 'dateTo must not precede dateFrom' });
    }
  }).parse(query);
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(orders.orderStatus, filters.status));
  if (filters.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  if (filters.dateFrom) conditions.push(gte(orders.createdAt, tehranDateStartUtc(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(orders.createdAt, tehranDateStartUtc(nextCalendarDate(filters.dateTo))));
  if (filters.search) {
    conditions.push(or(containsLiteral(orders.orderNumber, filters.search), containsLiteral(orders.customerName, filters.search),
      containsLiteral(orders.customerEmail, filters.search), containsLiteral(orders.customerPhone, filters.search))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const total = db.select({ total: sql<number>`count(*)` }).from(orders).where(where).get()!.total;
  const rows = db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize).all();
  return { orders: rows.map(row => orderDto(row, true)), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export function getAdminOrder(orderId: string) {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
  return { order: orderDto(order, true) };
}

const tehranDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9998) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function tehranDateStartUtc(value: string) {
  if (!isCalendarDate(value)) throw new Error('Invalid Tehran calendar date');
  const [year, month, day] = value.split('-').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  let candidate = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(tehranDateFormatter.formatToParts(new Date(candidate)).map(part => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    candidate = targetUtc - (representedAsUtc - candidate);
  }
  return new Date(candidate);
}

function nextCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

export function cancelUnpaidOrder(orderId: string, staffId: string, input: unknown) {
  const { reason } = cancelSchema.parse(input);
  return db.transaction(tx => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
    if (order.orderStatus !== 'awaiting_payment' || order.paymentStatus !== 'unpaid') throw new ApiError(409, 'ORDER_NOT_CANCELLABLE', 'فقط سفارش پرداخت‌نشده و در انتظار پرداخت قابل لغو است.');
    const active = tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderId, orderId), eq(inventoryReservations.status, 'active'))).all();
    const now = new Date();
    for (const reservation of active) {
      const stock = tx.update(inventory).set({ reserved: sql`${inventory.reserved} - ${reservation.quantity}`, updatedAt: now })
        .where(and(eq(inventory.variantId, reservation.variantId), sql`${inventory.reserved} >= ${reservation.quantity}`)).run();
      if (!stock.changes) throw new ApiError(409, 'RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
      tx.update(inventoryReservations).set({ status: 'released', releasedAt: now }).where(eq(inventoryReservations.id, reservation.id)).run();
      const [item] = tx.select({ sku: productVariants.sku }).from(productVariants).where(eq(productVariants.id, reservation.variantId)).all();
      const [stockRow] = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).all();
      tx.insert(stockMovements).values({ variantId: reservation.variantId, movementType: 'reservation_release', quantityDelta: 0,
        onHandBefore: stockRow.onHand, onHandAfter: stockRow.onHand, referenceType: 'order', referenceId: orderId,
        reason: `Reservation released for ${order.orderNumber}`, actorStaffId: staffId }).run();
      tx.insert(orderEvents).values({ orderId, eventType: 'reservation_released', actorType: 'staff', actorStaffId: staffId,
        note: 'رزرو موجودی آزاد شد.', metadata: { sku: item?.sku ?? '', quantity: reservation.quantity }, createdAt: now }).run();
    }
    tx.update(orders).set({ orderStatus: 'cancelled', cancelledAt: now, updatedAt: now }).where(eq(orders.id, orderId)).run();
    tx.insert(orderEvents).values({ orderId, eventType: 'order_cancelled', actorType: 'staff', actorStaffId: staffId,
      previousValue: order.orderStatus, newValue: 'cancelled', note: reason, createdAt: now }).run();
    const updated = tx.select().from(orders).where(eq(orders.id, orderId)).get()!;
    return { order: orderDto(updated, true) };
  }, { behavior: 'immediate' });
}

export function addOrderNote(orderId: string, staffId: string, input: unknown) {
  const { note } = noteSchema.parse(input);
  return db.transaction(tx => {
    const order = tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).get();
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
    tx.insert(orderEvents).values({ orderId, eventType: 'note_added', actorType: 'staff', actorStaffId: staffId, note, createdAt: new Date() }).run();
    return { order: orderDto(tx.select().from(orders).where(eq(orders.id, orderId)).get()!, true) };
  }, { behavior: 'immediate' });
}

export function updateOrderShippingAddress(orderId: string, staffId: string, input: unknown) {
  const body = addressChangeSchema.parse(input);
  const { reason, ...fields } = body;
  const snapshot = addressSnapshot({ ...fields, title: fields.title ?? '' });
  return db.transaction(tx => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
    if (order.fulfillmentStatus !== 'unfulfilled' || ['cancelled','completed'].includes(order.orderStatus)) throw new ApiError(409, 'ADDRESS_LOCKED', 'نشانی پس از شروع آماده‌سازی قابل تغییر نیست.');
    const previous = JSON.stringify(order.shippingAddressSnapshot);
    const next = JSON.stringify(snapshot);
    tx.update(orders).set({ shippingAddressSnapshot: snapshot, customerName: snapshot.recipientName, customerPhone: snapshot.phone, updatedAt: new Date() }).where(eq(orders.id, orderId)).run();
    tx.insert(orderEvents).values({ orderId, eventType: 'shipping_address_updated', actorType: 'staff', actorStaffId: staffId,
      previousValue: previous, newValue: next, note: reason, createdAt: new Date() }).run();
    return { order: orderDto(tx.select().from(orders).where(eq(orders.id, orderId)).get()!, true) };
  }, { behavior: 'immediate' });
}

export function expireReservations(now = new Date()) {
  return db.transaction(tx => {
    const expired = tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.status, 'active'), lte(inventoryReservations.expiresAt, now))).all();
    const expiredOrderIds = [...new Set(expired.map(reservation => reservation.orderId))];
    let released = 0;
    for (const orderId of expiredOrderIds) {
      const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
      if (!order || order.orderStatus !== 'awaiting_payment' || order.paymentStatus !== 'unpaid') continue;
      const active = tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active'))).all();
      for (const reservation of active) {
        const before = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get();
        if (!before) throw new ApiError(409, 'RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
        const stockResult = tx.update(inventory).set({ reserved: sql`${inventory.reserved} - ${reservation.quantity}`, updatedAt: now })
          .where(and(eq(inventory.variantId, reservation.variantId), sql`${inventory.reserved} >= ${reservation.quantity}`)).run();
        if (!stockResult.changes) throw new ApiError(409, 'RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
        tx.update(inventoryReservations).set({ status: 'expired', releasedAt: now }).where(and(eq(inventoryReservations.id, reservation.id), eq(inventoryReservations.status, 'active'))).run();
        const after = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get()!;
        tx.insert(stockMovements).values({ variantId: reservation.variantId, movementType: 'reservation_expired', quantityDelta: 0,
          onHandBefore: before.onHand, onHandAfter: after.onHand, referenceType: 'order', referenceId: order.id,
          reason: `Reservation expired for ${order.orderNumber}`, actorStaffId: null }).run();
        tx.insert(orderEvents).values({ orderId: order.id, eventType: 'reservation_released', actorType: 'system',
          note: 'مهلت پرداخت پایان یافت و رزرو موجودی آزاد شد.', metadata: { reservationId: reservation.id, quantity: reservation.quantity }, createdAt: now }).run();
        released++;
      }
      tx.update(orders).set({ orderStatus: 'cancelled', cancelledAt: now, updatedAt: now }).where(eq(orders.id, order.id)).run();
      tx.insert(orderEvents).values({ orderId: order.id, eventType: 'order_cancelled', actorType: 'system', previousValue: 'awaiting_payment',
        newValue: 'cancelled', note: 'مهلت پرداخت پایان یافت.', createdAt: now }).run();
    }
    return { released };
  }, { behavior: 'immediate' });
}

export function listAdminCustomers(query: unknown) {
  const filters = z.object({ search: z.string().trim().max(200).optional(), status: z.enum(['active','inactive','all']).default('all'),
    page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }).parse(query);
  const conditions: SQL[] = [];
  if (filters.status !== 'all') conditions.push(eq(users.status, filters.status));
  if (filters.search) {
    conditions.push(or(containsLiteral(users.fullName, filters.search), containsLiteral(users.email, filters.search), containsLiteral(users.phone, filters.search))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const total = db.select({ total: sql<number>`count(*)` }).from(users).where(where).get()!.total;
  const customerSummary = db.select({
    registeredCount: sql<number>`count(*)`,
    activeCount: sql<number>`coalesce(sum(case when ${users.status} = 'active' then 1 else 0 end), 0)`,
  }).from(users).get()!;
  const orderSummary = db.select({
    customersWithOrdersCount: sql<number>`count(distinct ${orders.userId})`,
    paidSpendTomans: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.totalTomans} else 0 end), 0)`,
  }).from(orders).get()!;
  const rows = db.select({ id: users.id, name: users.fullName, email: users.email, phone: users.phone, status: users.status,
    createdAt: users.createdAt }).from(users).where(where).orderBy(desc(users.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize).all();
  const aggregates = rows.length ? db.select({ userId: orders.userId, orderCount: sql<number>`count(*)`,
    lifetimeSpendTomans: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.totalTomans} else 0 end),0)`,
  }).from(orders).where(inArray(orders.userId, rows.map(row => row.id))).groupBy(orders.userId).all() : [];
  const metrics = new Map(aggregates.map(row => [row.userId, row]));
  return { customers: rows.map(row => ({ ...row, orderCount: metrics.get(row.id)?.orderCount ?? 0,
    lifetimeSpendTomans: metrics.get(row.id)?.lifetimeSpendTomans ?? 0 })),
    summary: { ...customerSummary, ...orderSummary },
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export function getAdminCustomer(customerId: string) {
  const user = db.select({ id: users.id, name: users.fullName, email: users.email, phone: users.phone, status: users.status,
    createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(eq(users.id, customerId)).get();
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'مشتری پیدا نشد.');
  const addresses = db.select().from(customerAddresses).where(eq(customerAddresses.userId, customerId)).orderBy(desc(customerAddresses.isDefault), asc(customerAddresses.createdAt)).all();
  const orderRows = db.select().from(orders).where(eq(orders.userId, customerId)).orderBy(desc(orders.createdAt)).limit(50).all();
  const totals = db.select({ orderCount: sql<number>`count(*)`, lifetimeSpendTomans: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.totalTomans} else 0 end),0)` }).from(orders).where(eq(orders.userId, customerId)).get()!;
  return { customer: { ...user, orderCount: totals.orderCount, lifetimeSpendTomans: totals.lifetimeSpendTomans }, addresses,
    orders: orderRows.map(row => orderDto(row, true)), supportHistoryAvailable: false };
}

export const orderIdSchema = z.string().uuid();
