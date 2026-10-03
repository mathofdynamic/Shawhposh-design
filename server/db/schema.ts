import { sqliteTable, text, integer, check, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';
const uuid = (name?: string) => text(name);
const timestamp = (name: string, _options?: unknown) => integer(name, { mode: 'timestamp_ms' });
const boolean = () => integer({ mode: 'boolean' });
const jsonb = () => text({ mode: 'json' });
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
