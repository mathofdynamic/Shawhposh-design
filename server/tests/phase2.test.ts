import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

const dir = mkdtempSync(join(tmpdir(), 'shawhposh-phase2-'));
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.SHIPPING_COST_TOMANS = '15000';
process.env.CHECKOUT_RESERVATION_MINUTES = '20';

const { db, sqlite } = await import('../db/connection');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
migrate(db, { migrationsFolder: 'server/db/migrations' });
const { app } = await import('../app');
const { staffUsers } = await import('../db/schema');
const { hashPassword } = await import('../modules/auth/service');
const { saveCategory, saveProduct, catalogSnapshot } = await import('../modules/catalog/service');
const { expireReservations, tehranDateStartUtc } = await import('../modules/orders/service');
const { config, shippingCostTomansSchema } = await import('../config');

test('blank shipping configuration remains unset', () => {
  assert.equal(shippingCostTomansSchema.parse(''), undefined);
  assert.equal(shippingCostTomansSchema.parse('   \t  '), undefined);
  assert.equal(shippingCostTomansSchema.parse('0'), 0);
  assert.equal(shippingCostTomansSchema.parse('15000'), 15000);
});

test('admin calendar-date boundaries resolve to Tehran midnight', () => {
  const boundary = tehranDateStartUtc('2026-10-03');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(boundary);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  assert.deepEqual([values.year, values.month, values.day, values.hour, values.minute, values.second], ['2026', '10', '03', '00', '00', '00']);
  assert.throws(() => tehranDateStartUtc('2026-02-31'));
});

const origin = 'http://localhost:3000';
const password = 'Phase2-test-password-123';
const ownerEmail = 'phase2-owner@example.invalid';
const owner = await db.insert(staffUsers).values({ email: ownerEmail, fullName: 'Phase 2 Owner', passwordHash: await hashPassword(password), role: 'owner' }).returning().then(rows => rows[0]);
const inventoryStaff = await db.insert(staffUsers).values({ email: 'phase2-inventory@example.invalid', fullName: 'Inventory Staff', passwordHash: await hashPassword(password), role: 'inventory' }).returning().then(rows => rows[0]);
const supportStaff = await db.insert(staffUsers).values({ email: 'phase2-support@example.invalid', fullName: 'Support Staff', passwordHash: await hashPassword(password), role: 'support' }).returning().then(rows => rows[0]);
saveCategory({ nameFa: 'گروه آزمون', slug: 'phase2-test' });
saveProduct({ name: 'پیراهن آزمون', slug: 'phase2-test-tee', category: 'phase2-test', basePriceTomans: 245000, status: 'active', description: 'آزمون', variants: [{ sku: 'P2-TEST-M-BLK', colorName: 'مشکی', colorHex: '#111111', size: 'M' }, { sku: 'P2-TEST-L-BLK', colorName: 'مشکی', colorHex: '#111111', size: 'L' }] });
const ownerAgent = request.agent(app);
await ownerAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: ownerEmail, password }).expect(200);

test('admin order date filters accept valid Tehran calendar dates only', async () => {
  await ownerAgent.get('/api/v1/admin/orders?dateFrom=2026-10-03&dateTo=2026-10-03').expect(200);
  await ownerAgent.get('/api/v1/admin/orders?dateFrom=2026-02-31').expect(422);
  await ownerAgent.get('/api/v1/admin/orders?dateFrom=2026-10-04&dateTo=2026-10-03').expect(422);
});

function registerCustomer(agent: ReturnType<typeof request.agent>, suffix: string) {
  return agent.post('/api/v1/auth/register').set('Origin', origin).send({
    fullName: `مشتری ${suffix}`,
    email: `phase2-${suffix}@example.invalid`,
    phone: suffix === 'one' ? '09121234567' : suffix === 'two' ? '09121234568' : `091212345${suffix.length}9`,
    password,
  });
}

const customerOne = request.agent(app);
const customerTwo = request.agent(app);
await registerCustomer(customerOne, 'one').expect(201);
await registerCustomer(customerTwo, 'two').expect(201);

test('customer account and addresses are private and persist in the database', async () => {
  assert.equal((await request(app).get('/api/v1/account')).status, 401);
  const account = await customerOne.get('/api/v1/account').expect(200);
  assert.equal(account.body.user.email, 'phase2-one@example.invalid');
  assert.equal(account.body.user.passwordHash, undefined);
  await customerOne.patch('/api/v1/account').set('Origin', origin).send({ fullName: 'نام به‌روزشده' }).expect(200);
  const address = await customerOne.post('/api/v1/account/addresses').set('Origin', origin).send({
    title: 'خانه', recipientName: 'نام گیرنده', phone: '09121234567', province: 'تهران', city: 'تهران',
    addressLine: 'خیابان نمونه، پلاک ۱۲', postalCode: '\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9\u06f0', isDefault: true,
  }).expect(201);
  assert.equal(address.body.address.isDefault, true);
  assert.equal(address.body.address.postalCode, '1234567890');
  const arabicDigitAddress = await customerOne.post('/api/v1/account/addresses').set('Origin', origin).send({
    title: 'Arabic digits', recipientName: address.body.address.recipientName, phone: address.body.address.phone,
    province: address.body.address.province, city: address.body.address.city, addressLine: address.body.address.addressLine,
    postalCode: '\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669\u0660', isDefault: false,
  }).expect(201);
  assert.equal(arabicDigitAddress.body.address.postalCode, '1234567890');
  assert.equal((await customerOne.get('/api/v1/account/addresses')).body.addresses.length, 2);
  assert.equal((await customerTwo.get(`/api/v1/account/addresses/${address.body.address.id}`)).status, 404);
  assert.equal((await customerTwo.patch(`/api/v1/account/addresses/${address.body.address.id}`).set('Origin', origin).send({ city: 'شهر دیگر' })).status, 404);
  assert.equal((await customerTwo.delete(`/api/v1/account/addresses/${address.body.address.id}`).set('Origin', origin).send({})).status, 404);
  assert.equal((await customerOne.get('/api/v1/account')).body.user.name, 'نام به‌روزشده');
});

test('phone-only customer cannot clear their only login identity', async () => {
  const phoneOnly = request.agent(app);
  await phoneOnly.post('/api/v1/auth/register').set('Origin', origin).send({ fullName: 'Phone Only', phone: '09121234569', password }).expect(201);
  const response = await phoneOnly.patch('/api/v1/account').set('Origin', origin).send({ phone: null }).expect(422);
  assert.equal(response.body.error.code, 'IDENTITY_REQUIRED');
  assert.equal((await phoneOnly.get('/api/v1/account').expect(200)).body.user.phone, '+989121234569');
});

test('cart stores variant IDs, recalculates price and availability, and enforces ownership', async () => {
  const variant = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-M-BLK')!;
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 3, reason: 'Phase 2 automated test setup' }).expect(200);
  const added = await customerOne.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1, priceTomans: 1 }).expect(200);
  assert.equal(added.body.cart.items[0].sku, 'P2-TEST-M-BLK');
  assert.equal(added.body.cart.items[0].unitPriceTomans, 245000);
  assert.equal(added.body.cart.items[0].lineTotalTomans, 245000);
  assert.equal(added.body.cart.items[0].availableQuantity, 3);
  const itemId = added.body.cart.items[0].id as string;
  const updated = await customerOne.patch(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({ quantity: 2 }).expect(200);
  assert.equal(updated.body.cart.items[0].quantity, 2);
  await customerOne.patch(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({ quantity: 21 }).expect(422);
  await customerOne.patch(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({ quantity: 4 }).expect(409);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 1, reason: 'Phase 2 availability test' }).expect(200);
  const stale = await customerOne.get('/api/v1/cart').expect(200);
  assert.equal(stale.body.cart.items[0].isAvailable, false);
  assert.equal(stale.body.cart.items[0].availableQuantity, 1);
  const otherCart = await customerTwo.get('/api/v1/cart').expect(200);
  assert.equal(otherCart.body.cart.items.length, 0);
  assert.equal((await customerTwo.patch(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({ quantity: 1 })).status, 404);
  assert.equal((await customerTwo.delete(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({})).status, 404);
  assert.equal((await customerOne.delete(`/api/v1/cart/items/${itemId}`).set('Origin', origin).send({})).body.cart.items.length, 0);
  const inactive = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-L-BLK')!;
  await ownerAgent.patch(`/api/v1/admin/variants/${inactive.id}`).set('Origin', origin).send({ isEnabled: false }).expect(200);
  assert.equal((await customerOne.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: inactive.id, quantity: 1 })).status, 409);
  assert.equal((await customerOne.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 })).status, 404);
});

test('legacy cart migration is partial, safe, and idempotent', async () => {
  const variant = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-M-BLK')!;
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 3, reason: 'Phase 2 legacy cart migration test setup' }).expect(200);
  const key = '74c4b840-ec3e-4d5e-8b6c-2a1495c2cc81';
  const payload = { items: [{ variantId: variant.id, quantity: 1 }, { variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 }] };
  const first = await customerTwo.post('/api/v1/cart/migrations').set('Origin', origin).set('Idempotency-Key', key).send(payload).expect(200);
  assert.equal(first.body.migration.accepted, 1);
  assert.equal(first.body.migration.rejected[0].reason, 'VARIANT_NOT_FOUND');
  assert.equal(first.body.cart.items.length, 1);
  const replay = await customerTwo.post('/api/v1/cart/migrations').set('Origin', origin).set('Idempotency-Key', key).send(payload).expect(200);
  assert.equal(replay.body.replayed, true);
  assert.equal(replay.body.cart.items.length, 1);
  assert.equal(replay.body.cart.items[0].quantity, 1);
  const conflict = await customerTwo.post('/api/v1/cart/migrations').set('Origin', origin).set('Idempotency-Key', key).send({ items: [{ variantId: variant.id, quantity: 2 }] });
  assert.equal(conflict.status, 409);
  await customerTwo.delete('/api/v1/cart').set('Origin', origin).send({}).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 legacy cart migration test cleanup' }).expect(200);
});

test('checkout creates one immutable awaiting-payment order, reserves stock, and cancellation releases it', async () => {
  const variant = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-M-BLK')!;
  const product = catalogSnapshot().products.find(item => item.slug === 'phase2-test-tee')!;
  const searchableName = 'Order_search_%_\\_marker';
  await customerOne.patch('/api/v1/account').set('Origin', origin).send({ fullName: searchableName }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 2, reason: 'Phase 2 checkout test setup' }).expect(200);
  await customerOne.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1 }).expect(200);
  const address = (await customerOne.get('/api/v1/account/addresses').expect(200)).body.addresses[0];
  const key = 'phase2-checkout-one-0001';
  await customerOne.patch(`/api/v1/account/addresses/${address.id}`).set('Origin', origin).send({ recipientName: searchableName }).expect(200);
  const created = await customerOne.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send({ addressId: address.id, customerNote: 'آزمون', subtotalTomans: 1, shippingTomans: 0, totalTomans: 1 }).expect(201);
  const order = created.body.order;
  assert.match(order.orderNumber, /^SHP-\d{8}-\d{6}$/);
  assert.equal(order.orderStatus, 'awaiting_payment');
  assert.equal(order.paymentStatus, 'unpaid');
  assert.equal(order.subtotalTomans, 245000);
  assert.equal(order.shippingTomans, 15000);
  assert.equal(order.totalTomans, 260000);
  assert.equal(order.items[0].sku, 'P2-TEST-M-BLK');
  assert.equal(order.items[0].unitPriceTomans, 245000);
  assert.equal(order.items[0].productName, 'پیراهن آزمون');
  for (const search of ['_', '%', '\\']) {
    const query = encodeURIComponent(search);
    const orderSearch = await ownerAgent.get(`/api/v1/admin/orders?search=${query}`).expect(200);
    assert.equal(orderSearch.body.pagination.total, 1, `order search should treat ${JSON.stringify(search)} literally`);
    assert.equal(orderSearch.body.orders[0].id, order.id);
    const customerSearch = await ownerAgent.get(`/api/v1/admin/customers?search=${query}&status=all`).expect(200);
    assert.equal(customerSearch.body.pagination.total, 1, `customer search should treat ${JSON.stringify(search)} literally`);
    assert.equal(customerSearch.body.customers[0].email, 'phase2-one@example.invalid');
  }
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 1);
  const retry = await customerOne.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send({ addressId: address.id, customerNote: 'آزمون' }).expect(200);
  assert.equal(retry.body.order.id, order.id);
  assert.equal((await customerOne.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send({ addressId: address.id, customerNote: 'متفاوت' })).status, 409);
  assert.equal((await customerTwo.get(`/api/v1/orders/${order.id}`).expect(404)).body.error.code, 'NOT_FOUND');
  assert.equal((await customerOne.get(`/api/v1/orders/${order.id}`).expect(200)).body.order.items[0].productName, 'پیراهن آزمون');
  await ownerAgent.patch(`/api/v1/admin/products/${product.id}`).set('Origin', origin).send({ name: 'نام تغییریافته', basePriceTomans: 999999 }).expect(200);
  assert.equal((await customerOne.get(`/api/v1/orders/${order.id}`).expect(200)).body.order.items[0].unitPriceTomans, 245000);
  await ownerAgent.patch(`/api/v1/admin/products/${product.id}`).set('Origin', origin).send({ name: 'پیراهن آزمون', basePriceTomans: 245000 }).expect(200);
  await ownerAgent.post(`/api/v1/admin/orders/${order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 2 automated unpaid-order cleanup' }).expect(200);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);
  const afterCancel = await customerOne.get(`/api/v1/orders/${order.id}`).expect(200);
  assert.equal(afterCancel.body.order.orderStatus, 'cancelled');
  assert.ok(afterCancel.body.order.timeline.some((entry: { type: string }) => entry.type === 'order_cancelled'));
  assert.equal((await ownerAgent.post(`/api/v1/admin/orders/${order.id}/mark-paid`).set('Origin', origin).send({}).expect(404)).status, 404);
  assert.equal((await customerOne.get('/api/v1/cart').expect(200)).body.cart.items.length, 0);
});

test('failed multi-item checkout rolls back the order, reservations, and cart conversion', async () => {
  const [medium, large] = catalogSnapshot().variants;
  await ownerAgent.patch(`/api/v1/admin/variants/${large.id}`).set('Origin', origin).send({ isEnabled: true }).expect(200);
  await ownerAgent.post(`/api/v1/admin/inventory/${medium.sku}/adjustments`).set('Origin', origin).send({ newQuantity: 2, reason: 'Phase 2 rollback test setup' }).expect(200);
  await ownerAgent.post(`/api/v1/admin/inventory/${large.sku}/adjustments`).set('Origin', origin).send({ newQuantity: 1, reason: 'Phase 2 rollback test setup' }).expect(200);
  await customerTwo.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: medium.id, quantity: 1 }).expect(200);
  await customerTwo.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: large.id, quantity: 1 }).expect(200);
  await ownerAgent.post(`/api/v1/admin/inventory/${large.sku}/adjustments`).set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 rollback stale-stock condition' }).expect(200);
  const failed = await customerTwo.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase2-rollback-checkout-01').send({ shippingAddress: { recipientName: 'مشتری دوم', phone: '09121234568', province: 'تهران', city: 'تهران', addressLine: 'خیابان نمونه، پلاک ۲۳', postalCode: '1234567891' } }).expect(409);
  assert.equal(failed.body.error.code, 'OUT_OF_STOCK');
  assert.equal((await customerTwo.get('/api/v1/account/orders').expect(200)).body.pagination.total, 0);
  assert.equal((await ownerAgent.get(`/api/v1/admin/inventory/${medium.sku}`).expect(200)).body.inventory.reservedStock, 0);
  assert.equal((await ownerAgent.get(`/api/v1/admin/inventory/${large.sku}`).expect(200)).body.inventory.reservedStock, 0);
  assert.equal((await customerTwo.get('/api/v1/cart').expect(200)).body.cart.items.length, 2);
  await customerTwo.delete('/api/v1/cart').set('Origin', origin).send({}).expect(200);
  await ownerAgent.post(`/api/v1/admin/inventory/${medium.sku}/adjustments`).set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 rollback test cleanup' }).expect(200);
  await ownerAgent.patch(`/api/v1/admin/variants/${large.id}`).set('Origin', origin).send({ isEnabled: false }).expect(200);
});

test('reservation expiration releases every line in an unpaid order once', async () => {
  const longVariant = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-L-BLK')!;
  await ownerAgent.patch(`/api/v1/admin/variants/${longVariant.id}`).set('Origin', origin).send({ isEnabled: true }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 3, reason: 'Phase 2 expiry test setup' }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-L-BLK/adjustments').set('Origin', origin).send({ newQuantity: 2, reason: 'Phase 2 expiry test setup' }).expect(200);
  const address = await customerTwo.post('/api/v1/account/addresses').set('Origin', origin).send({ title: 'آزمون', recipientName: 'مشتری دوم', phone: '09121234568', province: 'تهران', city: 'تهران', addressLine: 'خیابان نمونه، پلاک ۲۳', postalCode: '1234567891', isDefault: true }).expect(201);
  const variants = catalogSnapshot().variants;
  const medium = variants.find(item => item.sku === 'P2-TEST-M-BLK')!;
  await customerTwo.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: medium.id, quantity: 1 }).expect(200);
  await customerTwo.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: longVariant.id, quantity: 1 }).expect(200);
  const created = await customerTwo.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase2-expiration-test-01').send({ addressId: address.body.address.id }).expect(201);
  const result = expireReservations(new Date(Date.now() + 21 * 60_000));
  assert.equal(result.released, 2);
  assert.equal(expireReservations(new Date(Date.now() + 22 * 60_000)).released, 0);
  const detail = await customerTwo.get(`/api/v1/orders/${created.body.order.id}`).expect(200);
  assert.equal(detail.body.order.orderStatus, 'cancelled');
  assert.equal(detail.body.order.paymentStatus, 'unpaid');
  assert.equal(detail.body.order.timeline.filter((entry: { type: string }) => entry.type === 'reservation_released').length, 2);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-L-BLK').expect(200)).body.inventory.reservedStock, 0);
  const movement = (await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-L-BLK/movements').expect(200)).body.movements.find((entry: { type: string }) => entry.type === 'reservation_expired');
  assert.equal(movement.previousOnHand, 2);
  assert.equal(movement.newOnHand, 2);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 expiry test cleanup' }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-L-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 expiry test cleanup' }).expect(200);
  await ownerAgent.patch(`/api/v1/admin/variants/${longVariant.id}`).set('Origin', origin).send({ isEnabled: false }).expect(200);
});

test('simultaneous checkout cannot sell the last unit twice; support is read-only for order cancellation', async () => {
  const medium = catalogSnapshot().variants.find(item => item.sku === 'P2-TEST-M-BLK')!;
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 1, reason: 'Phase 2 concurrent checkout test setup' }).expect(200);
  const addresses = await customerOne.get('/api/v1/account/addresses').expect(200);
  assert.ok(addresses.body.addresses.length > 0);
  await customerOne.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: medium.id, quantity: 1 }).expect(200);
  await customerTwo.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: medium.id, quantity: 1 }).expect(200);
  const supportAgent = request.agent(app);
  await supportAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: 'phase2-support@example.invalid', password }).expect(200);
  const submissions = await Promise.all([
    customerOne.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase2-race-customer-one').send({ addressId: addresses.body.addresses[0].id }),
    customerTwo.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase2-race-customer-two').send({ shippingAddress: { recipientName: 'مشتری دوم', phone: '09121234568', province: 'تهران', city: 'تهران', addressLine: 'خیابان نمونه، پلاک ۲۳', postalCode: '1234567891' } }),
  ]);
  assert.deepEqual(submissions.map(response => response.status).sort(), [201, 409]);
  const winner = submissions.find(response => response.status === 201)!;
  assert.equal(submissions.find(response => response.status === 409)?.body.error.code, 'OUT_OF_STOCK');
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P2-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 1);
  const list = await supportAgent.get('/api/v1/admin/orders?page=1&pageSize=1').expect(200);
  assert.equal(list.body.pagination.page, 1);
  assert.equal(list.body.pagination.pageSize, 1);
  assert.ok(list.body.pagination.total >= 1);
  const customers = await supportAgent.get('/api/v1/admin/customers?search=phase2-one').expect(200);
  assert.equal(customers.body.customers.length, 1);
  const expectedSummary = sqlite.prepare(`select
    (select count(*) from users) as registeredCount,
    (select count(*) from users where status = 'active') as activeCount,
    (select count(distinct user_id) from orders) as customersWithOrdersCount,
    (select coalesce(sum(case when payment_status = 'paid' then total_tomans else 0 end), 0) from orders) as paidSpendTomans
  `).get();
  assert.deepEqual(customers.body.summary, expectedSummary);
  assert.ok(customers.body.customers[0].orderCount >= 1, JSON.stringify(customers.body.customers[0]));
  assert.equal(customers.body.customers[0].lifetimeSpendTomans, 0);
  assert.equal((await supportAgent.post(`/api/v1/admin/orders/${winner.body.order.id}/cancel`).set('Origin', origin).send({ reason: 'Must be denied' })).status, 403);
  await ownerAgent.post(`/api/v1/admin/orders/${winner.body.order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 2 concurrent checkout test cleanup' }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P2-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2 concurrent checkout test cleanup' }).expect(200);
});

test('checkout order creation stays disabled when no shipping fee is approved', async () => {
  const configuredFee = config.SHIPPING_COST_TOMANS;
  config.SHIPPING_COST_TOMANS = undefined;
  try {
    const configResponse = await request(app).get('/api/v1/checkout/config').expect(200);
    assert.equal(configResponse.body.orderSubmissionEnabled, false);
    assert.equal(configResponse.body.shippingTomans, null);
    const blocked = await customerOne.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase2-shipping-not-set-01').send({ addressId: '00000000-0000-4000-8000-000000000000' }).expect(503);
    assert.equal(blocked.body.error.code, 'SHIPPING_NOT_CONFIGURED');
  } finally { config.SHIPPING_COST_TOMANS = configuredFee; }
});

after(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
