import { sqliteTable, text, integer, check, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';
const uuid = (name?: string) => text(name);
const timestamp = (name: string, _options?: unknown) => integer(name, { mode: 'timestamp_ms' });
const boolean = (name?: string) => name ? integer(name, { mode: 'boolean' }) : integer({ mode: 'boolean' });
const jsonb = (name?: string) => name ? text(name, { mode: 'json' }) : text({ mode: 'json' });
import { sql } from 'drizzle-orm';

const timestamps = () => ({ createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull() });
export const users = sqliteTable('users', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), email: text().unique(), phone: text().unique(), passwordHash: text('password_hash').notNull(), fullName: text('full_name').notNull(), status: text().default('active').notNull(), emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }), phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }), ...timestamps(),
}, t => [check('user_identity', sql`${t.email} is not null or ${t.phone} is not null`)]);
export const staffUsers = sqliteTable('staff_users', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), email: text().unique().notNull(), passwordHash: text('password_hash').notNull(), fullName: text('full_name').notNull(), role: text().notNull(), status: text().default('active').notNull(), ...timestamps(),
}, t => [check('staff_role', sql`${t.role} in ('owner','store_manager','finance','production','inventory','support')`)]);
export const sessions = sqliteTable('sessions', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), userId: uuid('user_id').references(() => users.id), staffId: uuid('staff_id').references(() => staffUsers.id), tokenHash: text('token_hash').unique().notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(), lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(), revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, t => [check('session_principal', sql`(${t.userId} is null) <> (${t.staffId} is null)`), uniqueIndex('session_token_idx').on(t.tokenHash)]);
export const categories = sqliteTable('categories', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), name: text().notNull(), slug: text().unique().notNull(), description: text().default('').notNull(), status: text().default('active').notNull(), displayOrder: integer('display_order').default(0).notNull(), presentation: jsonb().$type<Record<string, unknown>>().default({}).notNull(), ...timestamps(),
});
export const products = sqliteTable('products', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), name: text().notNull(), slug: text().unique().notNull(), description: text().default('').notNull(), status: text().default('draft').notNull(), categoryId: uuid('category_id').references(() => categories.id).notNull(), basePriceTomans: integer('base_price_tomans').notNull(), customizable: boolean().default(false).notNull(), featured: boolean().default(false).notNull(), presentation: jsonb().$type<Record<string, unknown>>().default({}).notNull(), ...timestamps(),
}, t => [check('product_price', sql`${t.basePriceTomans} >= 0`), check('product_status', sql`${t.status} in ('active','draft','archived')`)]);
export const productMedia = sqliteTable('product_media', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), productId: uuid('product_id').references(() => products.id).notNull(), url: text().notNull(), altText: text('alt_text').default('').notNull(), type: text().default('image').notNull(), displayOrder: integer('display_order').default(0).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
});
export const productVariants = sqliteTable('product_variants', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), productId: uuid('product_id').references(() => products.id).notNull(), sku: text().unique().notNull(), colorName: text('color_name').notNull(), colorHex: text('color_hex').notNull(), size: text().notNull(), priceTomans: integer('price_tomans'), status: text().default('active').notNull(), weightGrams: integer('weight_grams'), lowStockThreshold: integer('low_stock_threshold').default(3).notNull(), presentation: jsonb().$type<Record<string, unknown>>().default({}).notNull(), ...timestamps(),
}, t => [check('variant_price', sql`${t.priceTomans} is null or ${t.priceTomans} >= 0`), check('variant_threshold', sql`${t.lowStockThreshold} >= 0`)]);
export const inventory = sqliteTable('inventory', {
  variantId: uuid('variant_id').primaryKey().references(() => productVariants.id), onHand: integer('on_hand').default(0).notNull(), reserved: integer().default(0).notNull(), damaged: integer().default(0).notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}, t => [check('inventory_nonnegative', sql`${t.onHand} >= 0 and ${t.reserved} >= 0 and ${t.damaged} >= 0 and ${t.onHand} >= ${t.reserved}`)]);
export const stockMovements = sqliteTable('stock_movements', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), variantId: uuid('variant_id').references(() => productVariants.id).notNull(), movementType: text('movement_type').notNull(), quantityDelta: integer('quantity_delta').notNull(), onHandBefore: integer('on_hand_before').notNull(), onHandAfter: integer('on_hand_after').notNull(), referenceType: text('reference_type'), referenceId: text('reference_id'), reason: text().notNull(), actorStaffId: uuid('actor_staff_id').references(() => staffUsers.id), createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
});

export const customerAddresses = sqliteTable('customer_addresses', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text(), recipientName: text('recipient_name').notNull(), phone: text().notNull(),
  province: text().notNull(), city: text().notNull(), addressLine: text('address_line').notNull(),
  postalCode: text('postal_code').notNull(), isDefault: boolean('is_default').default(false).notNull(),
  ...timestamps(),
}, t => [check('address_required_text', sql`length(trim(${t.recipientName})) > 0 and length(trim(${t.province})) > 0 and length(trim(${t.city})) > 0 and length(trim(${t.addressLine})) > 0`)]);

export const carts = sqliteTable('carts', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text().default('active').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }),
}, t => [check('cart_status', sql`${t.status} in ('active','converted','abandoned','expired')`), uniqueIndex('one_active_cart_per_customer').on(t.userId).where(sql`${t.status} = 'active'`) ]);

export const cartItems = sqliteTable('cart_items', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id).notNull(), quantity: integer().notNull(),
  customDesignId: uuid('custom_design_id'), ...timestamps(),
}, t => [check('cart_item_quantity', sql`${t.quantity} between 1 and 20`), uniqueIndex('cart_items_cart_variant_unique').on(t.cartId, t.variantId)]);

export const orders = sqliteTable('orders', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), orderNumber: text('order_number').unique().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'), customerName: text('customer_name').notNull(),
  shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, string>>().notNull(),
  subtotalTomans: integer('subtotal_tomans').notNull(), discountTomans: integer('discount_tomans').default(0).notNull(),
  shippingTomans: integer('shipping_tomans').notNull(), totalTomans: integer('total_tomans').notNull(),
  orderStatus: text('order_status').default('awaiting_payment').notNull(), paymentStatus: text('payment_status').default('unpaid').notNull(),
  productionStatus: text('production_status').default('not_required').notNull(), fulfillmentStatus: text('fulfillment_status').default('unfulfilled').notNull(),
  customerNote: text('customer_note'), ...timestamps(), cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, t => [
  check('order_amounts_nonnegative', sql`${t.subtotalTomans} >= 0 and ${t.discountTomans} >= 0 and ${t.shippingTomans} >= 0 and ${t.totalTomans} >= 0`),
  check('order_status_values', sql`${t.orderStatus} in ('draft','awaiting_payment','confirmed','cancelled','completed')`),
  check('payment_status_values', sql`${t.paymentStatus} in ('unpaid','pending','paid','failed','partially_refunded','refunded')`),
  check('production_status_values', sql`${t.productionStatus} in ('not_required','awaiting_design_review','approved','queued','in_production','qc','completed','blocked')`),
  check('fulfillment_status_values', sql`${t.fulfillmentStatus} in ('unfulfilled','ready_to_pack','packed','shipped','delivered','returned')`),
]);

export const orderItems = sqliteTable('order_items', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  skuSnapshot: text('sku_snapshot').notNull(), productNameSnapshot: text('product_name_snapshot').notNull(),
  variantSnapshot: jsonb('variant_snapshot').$type<Record<string, string>>().notNull(),
  unitPriceTomans: integer('unit_price_tomans').notNull(), quantity: integer().notNull(), lineTotalTomans: integer('line_total_tomans').notNull(),
  customDesignVersionId: uuid('custom_design_version_id'), createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}, t => [check('order_item_amounts', sql`${t.unitPriceTomans} >= 0 and ${t.quantity} > 0 and ${t.lineTotalTomans} = ${t.unitPriceTomans} * ${t.quantity}`)]);

export const inventoryReservations = sqliteTable('inventory_reservations', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id).notNull(), quantity: integer().notNull(),
  status: text().default('active').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }), consumedAt: timestamp('consumed_at', { withTimezone: true }),
}, t => [check('reservation_quantity', sql`${t.quantity} > 0`), check('reservation_status', sql`${t.status} in ('active','released','consumed','expired')`), uniqueIndex('reservation_order_variant_unique').on(t.orderId, t.variantId), index('inventory_reservations_expiry_idx').on(t.status, t.expiresAt)]);

export const orderEvents = sqliteTable('order_events', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(), actorType: text('actor_type').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorStaffId: uuid('actor_staff_id').references(() => staffUsers.id, { onDelete: 'set null' }),
  previousValue: text('previous_value'), newValue: text('new_value'), note: text(), metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}, t => [check('order_event_actor_type', sql`${t.actorType} in ('customer','staff','system')`)]);

export const checkoutIdempotency = sqliteTable('checkout_idempotency', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  key: text().notNull(), requestHash: text('request_hash').notNull(), orderId: uuid('order_id').references(() => orders.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}, t => [uniqueIndex('checkout_idempotency_user_key_unique').on(t.userId, t.key)]);

export const cartMigrations = sqliteTable('cart_migrations', {
  id: uuid().primaryKey().$defaultFn(() => randomUUID()), userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  key: text().notNull(), payloadHash: text('payload_hash').notNull(),
  result: jsonb('result').$type<{ accepted: number; rejected: Array<{ variantId: string; reason: string }> }>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}, t => [uniqueIndex('cart_migrations_user_key_unique').on(t.userId, t.key)]);

export const orderSequences = sqliteTable('order_sequences', {
  period: text().primaryKey(), value: integer().notNull(),
}, t => [check('order_sequence_positive', sql`${t.value} > 0`)]);
