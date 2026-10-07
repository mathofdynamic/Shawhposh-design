import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

const dir = mkdtempSync(join(tmpdir(), 'shawhposh-phase25-'));
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.CHECKOUT_RESERVATION_MINUTES = '20';

const { db, sqlite } = await import('../db/connection');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
migrate(db, { migrationsFolder: 'server/db/migrations' });
const { app } = await import('../app');
const { staffUsers } = await import('../db/schema');
const { hashPassword } = await import('../modules/auth/service');
const { saveCategory, saveProduct, catalogSnapshot } = await import('../modules/catalog/service');

type QuoteMethod = { id: string; code: string; name: string; description: string | null; priceTomans: number; totalTomans: number; estimatedMinDays: number | null; estimatedMaxDays: number | null };
type QuoteItem = { cartItemId: string; productId: string; variantId: string; sku: string; productName: string; colorName: string; colorHex: string; size: string; quantity: number; unitPriceTomans: number; lineTotalTomans: number; availableQuantity: number };
type QuoteBody = { subtotalTomans: number; discountTomans: number; shippingMethods: QuoteMethod[]; items: QuoteItem[] };

function expectedQuoteFor(quote: QuoteBody, selectedMethodId: string) {
  const shippingMethod = quote.shippingMethods.find(method => method.id === selectedMethodId);
  assert.ok(shippingMethod, 'selected shipping method must be present in the quote');
  return {
    subtotalTomans: quote.subtotalTomans,
    discountTomans: quote.discountTomans,
    shippingMethod,
    items: quote.items.map(({ availableQuantity: _availableQuantity, ...item }) => item),
  };
}

const origin = 'http://localhost:3000';
const password = 'Phase25-test-password-123';
const ownerEmail = 'phase25-owner@example.invalid';
const owner = await db.insert(staffUsers).values({ email: ownerEmail, fullName: 'Phase 2.5 Owner', passwordHash: await hashPassword(password), role: 'owner' }).returning().then(rows => rows[0]);
const managerEmail = 'phase25-manager@example.invalid';
await db.insert(staffUsers).values({ email: managerEmail, fullName: 'Phase 2.5 Manager', passwordHash: await hashPassword(password), role: 'store_manager' }).run();
await db.insert(staffUsers).values({ email: 'phase25-inventory@example.invalid', fullName: 'Phase 2.5 Inventory', passwordHash: await hashPassword(password), role: 'inventory' }).run();
await db.insert(staffUsers).values({ email: 'phase25-support@example.invalid', fullName: 'Phase 2.5 Support', passwordHash: await hashPassword(password), role: 'support' }).run();
saveCategory({ nameFa: 'گروه ارسال آزمون', slug: 'phase25-test' });
saveProduct({ name: 'پیراهن ارسال آزمون', slug: 'phase25-test-tee', category: 'phase25-test', basePriceTomans: 245000, status: 'active', variants: [{ sku: 'P25-TEST-M-BLK', colorName: 'مشکی', colorHex: '#111111', size: 'M' }] });

const ownerAgent = request.agent(app);
const managerAgent = request.agent(app);
const inventoryAgent = request.agent(app);
const supportAgent = request.agent(app);
await ownerAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: ownerEmail, password }).expect(200);
await managerAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: managerEmail, password }).expect(200);
await inventoryAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: 'phase25-inventory@example.invalid', password }).expect(200);
await supportAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: 'phase25-support@example.invalid', password }).expect(200);

let methodId = '';
let customer = request.agent(app);
let orderIds: string[] = [];
const variant = catalogSnapshot().variants.find(item => item.sku === 'P25-TEST-M-BLK')!;

test('shipping mutation is staff-protected and limited to owner/store manager', async () => {
  const payload = { code: 'phase25-standard', name: 'ارسال استاندارد', fixedPriceTomans: 20000, freeShippingThresholdTomans: 300000, estimatedMinDays: 2, estimatedMaxDays: 4, active: false, displayOrder: 0 };
  await request(app).get('/api/v1/admin/shipping/methods').expect(401);
  await supportAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send(payload).expect(403);
  await inventoryAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send(payload).expect(403);
  await supportAgent.get('/api/v1/admin/shipping/methods').expect(403);
  await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send({ ...payload, code: 'invalid-price', fixedPriceTomans: -1 }).expect(422);
  await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send({ ...payload, code: 'invalid-threshold', freeShippingThresholdTomans: -1 }).expect(422);
  await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send({ ...payload, code: 'invalid-active', fixedPriceTomans: null, active: true }).expect(422);
  const created = await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send(payload).expect(201);
  methodId = created.body.shippingMethod.id;
  assert.equal(created.body.shippingMethod.active, false);
  assert.equal((await request(app).get('/api/v1/shipping/methods').expect(200)).body.shippingMethods.length, 0);
  assert.equal((await request(app).get('/api/v1/checkout/config').expect(200)).body.orderSubmissionEnabled, false);
  await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send(payload).expect(409);
  await supportAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin).send({ active: true }).expect(403);
  await inventoryAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin).send({ active: true }).expect(403);
});

test('store manager can activate and edit a method; public list omits inactive and internal fields', async () => {
  const updated = await managerAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin)
    .send({ active: true, description: 'ارسال سفارش در بازه اعلام‌شده' }).expect(200);
  assert.equal(updated.body.shippingMethod.active, true);
  const publicList = await request(app).get('/api/v1/shipping/methods').expect(200);
  assert.equal(publicList.body.shippingMethods.length, 1);
  assert.equal(publicList.body.shippingMethods[0].fixedPriceTomans, 20000);
  assert.equal(publicList.body.shippingMethods[0].carrierType, undefined);
  assert.equal((await request(app).get('/api/v1/checkout/config').expect(200)).body.orderSubmissionEnabled, true);
});

test('quote and order use server totals, preserve shipping snapshots, and release reservations on cancel', async () => {
  await ownerAgent.post('/api/v1/admin/inventory/P25-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 5, reason: 'Phase 2.5 isolated shipping test setup' }).expect(200);
  await customer.post('/api/v1/auth/register').set('Origin', origin).send({ fullName: 'Phase 2.5 Test Customer', email: 'phase25-customer@example.invalid', phone: '09121234569', password }).expect(201);
  const address = await customer.post('/api/v1/account/addresses').set('Origin', origin).send({ title: 'آزمون', recipientName: 'گیرنده آزمون', phone: '09121234569', province: 'تهران', city: 'تهران', addressLine: 'خیابان نمونه، پلاک ۲۵', postalCode: '1234567891', isDefault: true }).expect(201);
  await customer.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1 }).expect(200);

  const quote = await customer.post('/api/v1/checkout/quote').set('Origin', origin).send({
    addressId: address.body.address.id, subtotalTomans: 1, discountTomans: 900000,
    shippingTomans: 0, totalTomans: 1,
  }).expect(200);
  assert.equal(quote.body.subtotalTomans, 245000);
  assert.equal(quote.body.discountTomans, 0);
  assert.equal(quote.body.currencyUnit, 'TOMAN');
  assert.deepEqual(quote.body.shippingMethods.map((method: { priceTomans: number; totalTomans: number }) => [method.priceTomans, method.totalTomans]), [[20000, 265000]]);
  assert.equal(quote.body.items[0].unitPriceTomans, 245000);
  assert.equal(quote.body.items[0].lineTotalTomans, 245000);

  await managerAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin).send({ fixedPriceTomans: 21000 }).expect(200);
  const staleQuote = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase25-stale-quote-001').send({
    addressId: address.body.address.id,
    shippingMethodId: methodId,
    expectedQuote: expectedQuoteFor(quote.body, methodId),
  }).expect(409);
  assert.equal(staleQuote.body.error.code, 'QUOTE_CHANGED');
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P25-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);
  assert.equal((await customer.get('/api/v1/cart').expect(200)).body.cart.items.length, 1);
  await managerAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin).send({ fixedPriceTomans: 20000 }).expect(200);

  const seededProduct = catalogSnapshot().products.find(item => item.slug === 'phase25-test-tee')!;
  await ownerAgent.patch(`/api/v1/admin/products/${seededProduct.id}`).set('Origin', origin).send({ basePriceTomans: 246000 }).expect(200);
  const staleProductQuote = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase25-stale-product-001').send({
    addressId: address.body.address.id,
    shippingMethodId: methodId,
    expectedQuote: expectedQuoteFor(quote.body, methodId),
  }).expect(409);
  assert.equal(staleProductQuote.body.error.code, 'QUOTE_CHANGED');
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P25-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);
  await ownerAgent.patch(`/api/v1/admin/products/${seededProduct.id}`).set('Origin', origin).send({ basePriceTomans: 245000 }).expect(200);

  const key = 'phase25-order-snapshot-001';
  const created = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send({
    addressId: address.body.address.id, shippingMethodId: methodId, subtotalTomans: 1, shippingTomans: 0, totalTomans: 1,
    expectedQuote: expectedQuoteFor(quote.body, methodId),
  }).expect(201);
  const order = created.body.order;
  orderIds.push(order.id);
  assert.equal(order.orderStatus, 'awaiting_payment');
  assert.equal(order.paymentStatus, 'unpaid');
  assert.equal(order.shippingMethodId, methodId);
  assert.equal(order.shippingMethodCode, 'phase25-standard');
  assert.equal(order.shippingMethodName, 'ارسال استاندارد');
  assert.equal(order.shippingTomans, 20000);
  assert.equal(order.totalTomans, 265000);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P25-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 1);
  const initialOrderRequest = { addressId: address.body.address.id, shippingMethodId: methodId, expectedQuote: expectedQuoteFor(quote.body, methodId) };
  const retry = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send(initialOrderRequest).expect(200);
  assert.equal(retry.body.order.id, order.id);

  await managerAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin)
    .send({ name: 'ارسال به‌روز', fixedPriceTomans: 30000, freeShippingThresholdTomans: 240000 }).expect(200);
  const oldDetail = await ownerAgent.get(`/api/v1/admin/orders/${order.id}`).expect(200);
  assert.equal(oldDetail.body.order.shippingMethodName, 'ارسال استاندارد');
  assert.equal(oldDetail.body.order.shippingMethodCode, 'phase25-standard');
  assert.equal(oldDetail.body.order.shippingTomans, 20000);
  const replay = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key).send(initialOrderRequest).expect(200);
  assert.equal(replay.body.order.id, order.id);
  await ownerAgent.post(`/api/v1/admin/orders/${order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 2.5 isolated snapshot test cleanup' }).expect(200);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P25-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);

  await customer.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1 }).expect(200);
  const freeQuote = await customer.post('/api/v1/checkout/quote').set('Origin', origin).send({ addressId: address.body.address.id }).expect(200);
  assert.equal(freeQuote.body.shippingMethods[0].priceTomans, 0);
  assert.equal(freeQuote.body.shippingMethods[0].totalTomans, 245000);
  const freeOrder = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase25-free-shipping-order-001')
    .send({ addressId: address.body.address.id, shippingMethodId: methodId, expectedQuote: expectedQuoteFor(freeQuote.body, methodId) }).expect(201);
  orderIds.push(freeOrder.body.order.id);
  assert.equal(freeOrder.body.order.shippingTomans, 0);
  assert.equal(freeOrder.body.order.totalTomans, 245000);
  await ownerAgent.post(`/api/v1/admin/orders/${freeOrder.body.order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 2.5 free threshold test cleanup' }).expect(200);
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P25-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 0);

  await customer.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1 }).expect(200);
  await ownerAgent.post('/api/v1/admin/inventory/P25-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2.5 isolated out-of-stock test' }).expect(200);
  const outOfStock = await customer.post('/api/v1/checkout/quote').set('Origin', origin).send({ addressId: address.body.address.id }).expect(409);
  assert.equal(outOfStock.body.error.code, 'OUT_OF_STOCK');
  await ownerAgent.post('/api/v1/admin/inventory/P25-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 5, reason: 'Phase 2.5 isolated out-of-stock test cleanup' }).expect(200);

  await managerAgent.patch(`/api/v1/admin/shipping/methods/${methodId}`).set('Origin', origin).send({ active: false }).expect(200);
  assert.equal((await request(app).get('/api/v1/shipping/methods').expect(200)).body.shippingMethods.length, 0);
  assert.equal((await request(app).get('/api/v1/checkout/config').expect(200)).body.orderSubmissionEnabled, false);
  const inactive = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', 'phase25-inactive-method-001')
    .send({ addressId: address.body.address.id, shippingMethodId: methodId, expectedQuote: expectedQuoteFor(freeQuote.body, methodId) }).expect(503);
  assert.equal(inactive.body.error.code, 'SHIPPING_UNAVAILABLE');
  await ownerAgent.post('/api/v1/admin/inventory/P25-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 0, reason: 'Phase 2.5 isolated shipping test final restore' }).expect(200);
  assert.deepEqual(sqlite.prepare("select order_status, payment_status from orders where id in (?,?) order by order_number").all(...orderIds), [
    { order_status: 'cancelled', payment_status: 'unpaid' },
    { order_status: 'cancelled', payment_status: 'unpaid' },
  ]);
});

after(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
