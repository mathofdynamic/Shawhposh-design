import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import type { BaleClient } from '../modules/payments/bale';
import sharp from 'sharp';

const dir = mkdtempSync(join(tmpdir(), 'shawhposh-phase3-'));
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.PAYMENT_RECEIPT_DIR = join(dir, 'private-receipts');
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.CHECKOUT_RESERVATION_MINUTES = '20';
process.env.BALE_BOT_TOKEN = 'test-bot-token-not-real';
process.env.BALE_BOT_USERNAME = 'shawhposh_test_bot';
process.env.BALE_PAYMENT_PROVIDER_TOKEN = 'WALLET-TEST-1111111111111111';
process.env.BALE_WEBHOOK_SECRET = 'phase3-test-webhook-secret-32-characters';

const { db, sqlite } = await import('../db/connection');
const { isAllowedBaleApiBase } = await import('../config');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
migrate(db, { migrationsFolder: 'server/db/migrations' });
const { app } = await import('../app');
const { staffUsers, paymentAttempts, orders, inventoryReservations } = await import('../db/schema');
const { hashPassword } = await import('../modules/auth/service');
const { saveCategory, saveProduct, catalogSnapshot } = await import('../modules/catalog/service');
const { expireReservations } = await import('../modules/orders/service');
const { claimWebhookUpdate, expirePaymentAttempt, finishWebhookUpdate, getBaleReverificationContext, updateBalePaymentSettings } = await import('../modules/payments/service');
const { configureBaleWebhook, processBaleWebhookUpdate, reverifyBalePayment } = await import('../modules/payments/bale');
const { validateBalePreCheckout } = await import('../modules/payments/service');

const origin = 'http://localhost:3000';
const password = 'Phase3-isolated-test-password-123';
const ownerEmail = 'phase3-owner@example.invalid';
const financeEmail = 'phase3-finance@example.invalid';
const supportEmail = 'phase3-support@example.invalid';
const owner = await db.insert(staffUsers).values({ email: ownerEmail, fullName: 'Phase 3 Owner', passwordHash: await hashPassword(password), role: 'owner' }).returning().then(rows => rows[0]);
await db.insert(staffUsers).values({ email: financeEmail, fullName: 'Phase 3 Finance', passwordHash: await hashPassword(password), role: 'finance' }).run();
await db.insert(staffUsers).values({ email: supportEmail, fullName: 'Phase 3 Support', passwordHash: await hashPassword(password), role: 'support' }).run();
saveCategory({ nameFa: 'گروه پرداخت آزمون', slug: 'phase3-test' });
saveProduct({ name: 'پیراهن پرداخت آزمون', slug: 'phase3-test-tee', category: 'phase3-test', basePriceTomans: 125000, status: 'active', variants: [{ sku: 'P3-TEST-M-BLK', colorName: 'مشکی', colorHex: '#111111', size: 'M' }] });

const ownerAgent = request.agent(app);
const financeAgent = request.agent(app);
const supportAgent = request.agent(app);
await ownerAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: ownerEmail, password }).expect(200);
await financeAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: financeEmail, password }).expect(200);
await supportAgent.post('/api/v1/admin/auth/login').set('Origin', origin).send({ identifier: supportEmail, password }).expect(200);

const customer = request.agent(app);
const otherCustomer = request.agent(app);
await customer.post('/api/v1/auth/register').set('Origin', origin).send({ fullName: 'Phase 3 Customer', email: 'phase3-customer@example.invalid', phone: '09121234561', password }).expect(201);
await otherCustomer.post('/api/v1/auth/register').set('Origin', origin).send({ fullName: 'Phase 3 Other Customer', email: 'phase3-other@example.invalid', phone: '09121234562', password }).expect(201);
const address = await customer.post('/api/v1/account/addresses').set('Origin', origin).send({ title: 'Test', recipientName: 'Test Recipient', phone: '09121234561', province: 'Tehran', city: 'Tehran', addressLine: 'Phase three payment test address', postalCode: '1234567890', isDefault: true }).expect(201);
const shipping = await ownerAgent.post('/api/v1/admin/shipping/methods').set('Origin', origin).send({ code: 'phase3-test-shipping', name: 'ارسال آزمون', fixedPriceTomans: 10000, freeShippingThresholdTomans: null, estimatedMinDays: 2, estimatedMaxDays: 4, active: true, displayOrder: 0 }).expect(201);
const variant = catalogSnapshot().variants.find(item => item.sku === 'P3-TEST-M-BLK')!;
await ownerAgent.post('/api/v1/admin/inventory/P3-TEST-M-BLK/adjustments').set('Origin', origin).send({ newQuantity: 20, reason: 'Isolated Phase 3 test fixture setup' }).expect(200);
const countRows = (query: string, ...parameters: unknown[]) => (sqlite.prepare(query).get(...parameters) as { total: number }).total;

test('production Bale API requests are restricted to the official host', () => {
  assert.equal(isAllowedBaleApiBase('https://tapi.bale.ai', 'production'), true);
  assert.equal(isAllowedBaleApiBase('https://tapi.bale.ai/', 'production'), true);
  assert.equal(isAllowedBaleApiBase('https://tapi.bale.ai.attacker.example', 'production'), false);
  assert.equal(isAllowedBaleApiBase('http://tapi.bale.ai', 'production'), false);
  assert.equal(isAllowedBaleApiBase('https://localhost:9443', 'production'), false);
  assert.equal(isAllowedBaleApiBase('https://localhost:9443', 'test'), true);
});

async function makeOrder(key: string) {
  await customer.post('/api/v1/cart/items').set('Origin', origin).send({ variantId: variant.id, quantity: 1 }).expect(200);
  const quote = await customer.post('/api/v1/checkout/quote').set('Origin', origin).send({ addressId: address.body.address.id }).expect(200);
  const selected = quote.body.shippingMethods.find((method: { id: string }) => method.id === shipping.body.shippingMethod.id);
  assert.ok(selected);
  const expectedQuote = { subtotalTomans: quote.body.subtotalTomans, discountTomans: quote.body.discountTomans,
    shippingMethod: selected, items: quote.body.items.map(({ availableQuantity: _available, ...item }: { availableQuantity: number; [key: string]: unknown }) => item) };
  const response = await customer.post('/api/v1/checkout/orders').set('Origin', origin).set('Idempotency-Key', key)
    .send({ addressId: address.body.address.id, shippingMethodId: shipping.body.shippingMethod.id, expectedQuote }).expect(201);
  return response.body.order as { id: string; orderNumber: string; totalTomans: number };
}

let cardOrder: Awaited<ReturnType<typeof makeOrder>>;
let cardAttemptId = '';
const testCard = '4111111111111111';
const tinyPng = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 20, g: 140, b: 90 } } }).png().toBuffer();
const excessivePixelPng = await sharp({ create: { width: 3500, height: 3500, channels: 3, background: { r: 20, g: 140, b: 90 } } }).png().toBuffer();

test('payment configuration stays disabled until deliberate owner setup and enforces roles', async () => {
  const publicInitial = await request(app).get('/api/v1/payment-methods/methods').expect(200);
  assert.deepEqual(publicInitial.body.methods, []);
  assert.equal(publicInitial.body.unavailableReason, 'NO_ACTIVE_PAYMENT_METHOD');
  await request(app).get('/api/v1/admin/payments/settings').expect(401);
  await supportAgent.get('/api/v1/admin/payments/settings').expect(403);
  await supportAgent.patch('/api/v1/admin/payments/settings/card-to-card').set('Origin', origin).send({ enabled: true }).expect(403);
  await ownerAgent.patch('/api/v1/admin/payments/settings/card-to-card').set('Origin', origin).send({ enabled: true, cardholderName: 'Test', cardNumber: '1234567890123456', manualReviewHoldHours: 12 }).expect(422);
  const initial = await ownerAgent.get('/api/v1/admin/payments/settings').expect(200);
  assert.equal(initial.body.methods.card_to_card.enabled, false);
  assert.equal(initial.body.methods.bale_wallet.enabled, false);
  assert.equal(initial.body.methods.bale_wallet.configured, true);
  await ownerAgent.patch('/api/v1/admin/payments/settings/card-to-card').set('Origin', origin).send({ enabled: true, bankName: 'Test Bank', cardholderName: 'Test Cardholder', cardNumber: testCard, accountIban: null, instructions: 'Test only', manualReviewMessage: null, manualReviewHoldHours: 12 }).expect(200);
  assert.throws(() => updateBalePaymentSettings({ enabled: true }), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'BALE_WEBHOOK_UNVERIFIED');
  let configuredWebhookUrl = '';
  const webhookClient = {
    async setWebhook(url: string) { configuredWebhookUrl = url; },
    async getWebhookInfo() { return { url: configuredWebhookUrl }; },
  } as unknown as BaleClient;
  await configureBaleWebhook(webhookClient);
  assert.equal(configuredWebhookUrl, `${origin}/api/v1/payments/bale/webhook/${process.env.BALE_WEBHOOK_SECRET}`);
  await assert.rejects(configureBaleWebhook({
    async setWebhook() {}, async getWebhookInfo() { return { url: 'https://wrong.example/webhook' }; },
  } as unknown as BaleClient), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'BALE_WEBHOOK_VERIFICATION_FAILED');
  updateBalePaymentSettings({ enabled: true }, true);
  const configured = await ownerAgent.get('/api/v1/admin/payments/settings').expect(200);
  assert.equal(configured.body.methods.card_to_card.cardNumber, testCard);
  assert.equal(configured.body.methods.bale_wallet.botToken, undefined);
  assert.equal(configured.body.methods.bale_wallet.providerToken, undefined);
  const publicConfigured = await request(app).get('/api/v1/payment-methods/methods').expect(200);
  assert.deepEqual(publicConfigured.body.methods.map((method: { method: string }) => method.method), ['card_to_card', 'bale_wallet']);
  assert.equal(JSON.stringify(publicConfigured.body).includes(testCard), false);
  cardOrder = await makeOrder('phase3-card-order-idem-001');
});

test('Bale webhook acknowledgements distinguish completed, active, failed, and stale updates', async () => {
  const secret = process.env.BALE_WEBHOOK_SECRET!;
  const activeId = '7201';
  assert.equal(claimWebhookUpdate(activeId, 'other'), 'claimed');
  await request(app).post(`/api/v1/payments/bale/webhook/${secret}`).send({ update_id: Number(activeId) }).expect(503);
  sqlite.prepare('update bale_webhook_updates set created_at=? where update_id=?').run(Date.now() - 31_000, activeId);
  await request(app).post(`/api/v1/payments/bale/webhook/${secret}`).send({ update_id: Number(activeId) }).expect(200);
  assert.equal(claimWebhookUpdate(activeId, 'other'), 'processed');
  await request(app).post(`/api/v1/payments/bale/webhook/${secret}`).send({ update_id: Number(activeId) }).expect(200);

  const failedId = '7202';
  assert.equal(claimWebhookUpdate(failedId, 'other'), 'claimed');
  finishWebhookUpdate(failedId, 'TEMPORARY_FAILURE');
  assert.equal(claimWebhookUpdate(failedId, 'other'), 'claimed');
  finishWebhookUpdate(failedId);
  assert.equal(claimWebhookUpdate(failedId, 'other'), 'processed');
});

test('manual card flow protects ownership, validates receipt bytes, waits for review, and consumes inventory once', async () => {
  await request(app).post(`/api/v1/orders/${cardOrder.id}/payments/card-to-card`).set('Origin', origin).send({}).expect(401);
  await otherCustomer.post(`/api/v1/orders/${cardOrder.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-idempotency-foreign').send({}).expect(404);
  const options = await customer.get(`/api/v1/orders/${cardOrder.id}/payment-options`).expect(200);
  assert.deepEqual(options.body.methods.map((method: { method: string }) => method.method), ['card_to_card', 'bale_wallet']);
  const created = await customer.post(`/api/v1/orders/${cardOrder.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-card-attempt-001').send({ amountTomans: 1 }).expect(201);
  cardAttemptId = created.body.attempt.id;
  assert.equal(created.body.attempt.amountTomans, cardOrder.totalTomans);
  assert.equal(created.body.card.cardNumber, testCard);
  assert.equal((await customer.post(`/api/v1/orders/${cardOrder.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-card-attempt-001').send({ amountTomans: 1 }).expect(201)).body.attempt.id, cardAttemptId);
  assert.equal(countRows('select count(*) as total from payment_attempts where order_id=?', cardOrder.id), 1);
  await otherCustomer.get(`/api/v1/payments/${cardAttemptId}/status`).expect(404);
  await otherCustomer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.11').attach('receipt', tinyPng, { filename: 'r.png', contentType: 'image/png' }).expect(404);

  await customer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.12')
    .attach('receipt', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { filename: 'r.svg', contentType: 'image/svg+xml' }).expect(422);
  await customer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.13')
    .attach('receipt', Buffer.from('not an image'), { filename: 'r.png', contentType: 'image/png' }).expect(422);
  await customer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.16')
    .attach('receipt', excessivePixelPng, { filename: 'huge.png', contentType: 'image/png' }).expect(422);
  await customer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.14')
    .attach('receipt', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' }).expect(413);

  const stockBefore = (await ownerAgent.get('/api/v1/admin/inventory/P3-TEST-M-BLK').expect(200)).body.inventory;
  const submitted = await customer.post(`/api/v1/payments/${cardAttemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.15')
    .attach('receipt', tinyPng, { filename: 'bank-receipt.png', contentType: 'image/png' }).expect(201);
  assert.equal(submitted.body.attempt.status, 'pending_verification');
  assert.equal((await customer.get(`/api/v1/orders/${cardOrder.id}`).expect(200)).body.order.paymentStatus, 'pending');
  const stockPending = (await ownerAgent.get('/api/v1/admin/inventory/P3-TEST-M-BLK').expect(200)).body.inventory;
  assert.equal(stockPending.onHand, stockBefore.onHand);
  assert.equal(stockPending.reservedStock, stockBefore.reservedStock);
  assert.ok(new Date(submitted.body.attempt.expiresAt).getTime() > Date.now() + 11 * 3600_000);

  await supportAgent.post(`/api/v1/admin/payments/${cardAttemptId}/manual-approve`).set('Origin', origin).send({ acknowledged: true }).expect(403);
  await financeAgent.post(`/api/v1/admin/payments/${cardAttemptId}/manual-approve`).set('Origin', origin).send({ acknowledged: false }).expect(422);
  await financeAgent.post(`/api/v1/admin/payments/${cardAttemptId}/manual-reject`).set('Origin', origin).send({ reason: '' }).expect(422);
  const adminDetail = await financeAgent.get(`/api/v1/admin/payments/${cardAttemptId}`).expect(200);
  assert.equal(adminDetail.body.payment.receipts[0].reviewStatus, 'pending');
  const receiptResponse = await financeAgent.get(adminDetail.body.payment.receipts[0].url).expect(200);
  assert.equal(receiptResponse.headers['content-type'], 'image/webp');
  await financeAgent.post(`/api/v1/admin/payments/${cardAttemptId}/manual-approve`).set('Origin', origin).send({ acknowledged: true }).expect(200);
  const duplicateApproval = await ownerAgent.post(`/api/v1/admin/payments/${cardAttemptId}/manual-approve`).set('Origin', origin).send({ acknowledged: true }).expect(200);
  assert.equal(duplicateApproval.body.idempotent, true);
  const paidOrder = await customer.get(`/api/v1/orders/${cardOrder.id}`).expect(200);
  assert.equal(paidOrder.body.order.paymentStatus, 'paid');
  assert.equal(paidOrder.body.order.payment.status, 'verified');
  const stockPaid = (await ownerAgent.get('/api/v1/admin/inventory/P3-TEST-M-BLK').expect(200)).body.inventory;
  assert.equal(stockPaid.onHandStock, stockBefore.onHandStock - 1);
  assert.equal(stockPaid.reservedStock, stockBefore.reservedStock - 1);
  assert.equal(countRows("select count(*) as total from stock_movements where reference_id=? and movement_type='sale_committed'", cardOrder.id), 1);
  assert.equal(countRows("select count(*) as total from manual_payment_receipts where payment_attempt_id=? and review_status='approved'", cardAttemptId), 1);
});

test('reservation expiry closes a pending manual review and releases stock idempotently', async () => {
  const order = await makeOrder('phase3-expiry-order-idem-001');
  const attempt = await customer.post(`/api/v1/orders/${order.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-expiry-attempt-001').send({}).expect(201);
  const attemptId = attempt.body.attempt.id as string;
  await customer.post(`/api/v1/payments/${attemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.21').attach('receipt', tinyPng, { filename: 'r.png', contentType: 'image/png' }).expect(201);
  const future = new Date(Date.now() + 13 * 3600_000);
  db.update(inventoryReservations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(inventoryReservations.orderId, order.id)).run();
  assert.deepEqual(expireReservations(future), { released: 1 });
  assert.deepEqual(expireReservations(future), { released: 0 });
  const orderAfter = db.select().from(orders).where(eq(orders.id, order.id)).get()!;
  const attemptAfter = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get()!;
  assert.equal(orderAfter.orderStatus, 'cancelled');
  assert.equal(orderAfter.paymentStatus, 'unpaid');
  assert.equal(attemptAfter.status, 'expired');
  assert.equal((sqlite.prepare("select review_status from manual_payment_receipts where payment_attempt_id=?").get(attemptId) as { review_status: string }).review_status, 'rejected');
});

test('manual rejection requires a reason, keeps order unpaid and permits a fresh attempt', async () => {
  const order = await makeOrder('phase3-retry-order-idem-001');
  const first = await customer.post(`/api/v1/orders/${order.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-retry-card-first').send({}).expect(201);
  const attemptId = first.body.attempt.id as string;
  await customer.post(`/api/v1/payments/${attemptId}/receipt`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.31').attach('receipt', tinyPng, { filename: 'r.png', contentType: 'image/png' }).expect(201);
  await financeAgent.post(`/api/v1/admin/payments/${attemptId}/manual-reject`).set('Origin', origin).send({ reason: 'مبلغ تطبیق ندارد' }).expect(200);
  const customerStatus = await customer.get(`/api/v1/payments/${attemptId}/status`).expect(200);
  assert.equal(customerStatus.body.order.paymentStatus, 'unpaid');
  assert.equal(customerStatus.body.attempt.status, 'rejected');
  assert.equal(customerStatus.body.receipt.reviewNote, 'مبلغ تطبیق ندارد');
  const next = await customer.post(`/api/v1/orders/${order.id}/payments/card-to-card`).set('Origin', origin).set('Idempotency-Key', 'phase3-retry-card-second').send({}).expect(201);
  assert.notEqual(next.body.attempt.id, attemptId);
  assert.equal(next.body.attempt.status, 'awaiting_customer');
  assert.equal(expirePaymentAttempt(next.body.attempt.id, 'Phase 3 test cleanup'), true);
  await ownerAgent.post(`/api/v1/admin/orders/${order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 3 isolated retry test cleanup' }).expect(200);
});

test('Bale wallet uses opaque start tokens, rejects mismatched pre-checkout, verifies inquiry, deduplicates updates and consumes stock', async () => {
  const order = await makeOrder('phase3-bale-order-idem-001');
  const create = () => customer.post(`/api/v1/orders/${order.id}/payments/bale`).set('Origin', origin).set('Idempotency-Key', 'phase3-bale-attempt-001').send({ amountTomans: 1 });
  const first = await create().expect(201);
  const replay = await create().expect(201);
  const attemptId = first.body.attempt.id as string;
  assert.equal(replay.body.attempt.id, attemptId);
  assert.equal(first.body.attempt.amountProviderUnits, order.totalTomans * 10);
  assert.match(first.body.paymentUrl, /^https:\/\/ble\.ir\/shawhposh_test_bot\?start=[A-Za-z0-9_-]{43}$/);
  assert.equal(first.body.paymentUrl.includes(order.id), false);
  assert.equal(countRows('select count(*) as total from payment_attempts where order_id=?', order.id), 1);
  const token = new URL(first.body.paymentUrl).searchParams.get('start')!;
  const baleState: { invoice?: { payload: string; amount: number }; inquiryStatus: string; answered?: boolean; failNextInquiry?: boolean } = { inquiryStatus: 'pending' };
  const client: BaleClient = {
    async sendInvoice(input) { baleState.invoice = { payload: input.payload, amount: input.amountRials }; return { messageId: 'invoice-1' }; },
    async sendMessage() {},
    async answerPreCheckoutQuery(input) { baleState.answered = input.ok; },
    async inquireTransaction(transactionId) {
      if (baleState.failNextInquiry) { baleState.failNextInquiry = false; throw new Error('temporary test outage'); }
      return { id: transactionId, status: baleState.inquiryStatus, userId: 'bale-user-100', amount: order.totalTomans * 10 };
    },
    async setWebhook() {},
    async getWebhookInfo() { return { url: '' }; },
  };
  await processBaleWebhookUpdate({ update_id: 7001, message: { message_id: 1, text: `/start ${token}`, chat: { id: 'bale-user-100', type: 'private' }, from: { id: 'bale-user-100', is_bot: false } } }, client);
  assert.ok(baleState.invoice);
  assert.equal(validateBalePreCheckout({ invoicePayload: baleState.invoice!.payload, currency: 'USD', totalAmount: baleState.invoice!.amount, baleUserId: 'bale-user-100', transactionId: 'pre-1' }).ok, false);
  assert.equal(validateBalePreCheckout({ invoicePayload: baleState.invoice!.payload, currency: 'IRR', totalAmount: baleState.invoice!.amount + 10, baleUserId: 'bale-user-100', transactionId: 'pre-1' }).ok, false);
  await processBaleWebhookUpdate({ update_id: 7002, pre_checkout_query: { id: 'bale-tx-7003', from: { id: 'bale-user-100' }, currency: 'IRR', total_amount: baleState.invoice!.amount, invoice_payload: baleState.invoice!.payload } }, client);
  assert.equal(baleState.answered, true);
  const incoming = { update_id: 7003, message: { message_id: 2, chat: { id: 'bale-user-100', type: 'private' }, from: { id: 'bale-user-100', is_bot: false }, successful_payment: { currency: 'IRR', total_amount: baleState.invoice!.amount, invoice_payload: baleState.invoice!.payload, telegram_payment_charge_id: 'bale-tx-7003', provider_payment_charge_id: 'provider-ref-7003' } } };
  baleState.failNextInquiry = true;
  await assert.rejects(processBaleWebhookUpdate(incoming, client));
  assert.equal((await customer.get(`/api/v1/orders/${order.id}`).expect(200)).body.order.paymentStatus, 'pending');
  assert.equal((await ownerAgent.get('/api/v1/admin/inventory/P3-TEST-M-BLK').expect(200)).body.inventory.reservedStock, 1);
  assert.equal(getBaleReverificationContext(attemptId).attempt.externalTransactionId, 'bale-tx-7003');
  const expiredReservationTime = new Date(Date.now() + 30 * 60_000);
  db.update(inventoryReservations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(inventoryReservations.orderId, order.id)).run();
  assert.deepEqual(expireReservations(expiredReservationTime), { released: 0 });
  assert.equal(db.select().from(orders).where(eq(orders.id, order.id)).get()!.orderStatus, 'awaiting_payment');
  assert.ok(db.select().from(inventoryReservations).where(eq(inventoryReservations.orderId, order.id)).get()!.expiresAt > expiredReservationTime);
  baleState.inquiryStatus = 'paid';
  const reverified = await reverifyBalePayment(attemptId, client);
  assert.equal(reverified.verified, true);
  const duplicateWebhook = await processBaleWebhookUpdate(incoming, client);
  assert.equal(duplicateWebhook.duplicate, false);
  assert.equal((await processBaleWebhookUpdate(incoming, client)).duplicate, true);
  assert.equal((await customer.get(`/api/v1/orders/${order.id}`).expect(200)).body.order.paymentStatus, 'paid');
  const stockPaid = (await ownerAgent.get('/api/v1/admin/inventory/P3-TEST-M-BLK').expect(200)).body.inventory;
  assert.equal(stockPaid.reservedStock, 0);
  assert.equal(countRows("select count(*) as total from stock_movements where reference_id=? and movement_type='sale_committed'", order.id), 1);
  assert.equal(countRows("select count(*) as total from order_events where order_id=? and event_type='payment_verified'", order.id), 1);
});

test('ambiguous Bale invoice delivery can recover with the same payload and bound Bale identity', async () => {
  const order = await makeOrder('phase3-bale-recovery-order-001');
  const created = await customer.post(`/api/v1/orders/${order.id}/payments/bale`).set('Origin', origin)
    .set('X-Forwarded-For', '203.0.113.73').set('Idempotency-Key', 'phase3-bale-recovery-attempt-001').send({}).expect(201);
  const attemptId = created.body.attempt.id as string;
  const firstToken = new URL(created.body.paymentUrl).searchParams.get('start')!;
  let firstPayload = '';
  let recoveredPayload = '';
  let answered = false;
  const timeoutClient: BaleClient = {
    async sendInvoice(input) { firstPayload = input.payload; throw new Error('request timed out after delivery may have started'); },
    async sendMessage() {},
    async answerPreCheckoutQuery() {},
    async inquireTransaction(transactionId) { return { id: transactionId, status: 'paid', userId: 'bale-recovery-user', amount: order.totalTomans * 10 }; },
    async setWebhook() {}, async getWebhookInfo() { return { url: '' }; },
  };
  await assert.rejects(processBaleWebhookUpdate({ update_id: 7301, message: { text: `/start ${firstToken}`, chat: { id: 'bale-recovery-user', type: 'private' }, from: { id: 'bale-recovery-user', is_bot: false } } }, timeoutClient));
  const uncertain = await customer.get(`/api/v1/payments/${attemptId}/status`).expect(200);
  assert.equal(uncertain.body.attempt.baleInvoiceStatus, 'unknown');
  assert.equal(uncertain.body.order.paymentStatus, 'pending');
  const recoveryLink = await customer.post(`/api/v1/payments/${attemptId}/bale/link`).set('Origin', origin).set('X-Forwarded-For', '203.0.113.73').send({}).expect(200);
  assert.equal(recoveryLink.body.invoiceStatus, 'unknown');
  const recoveryToken = new URL(recoveryLink.body.paymentUrl).searchParams.get('start')!;
  const replayClient: BaleClient = {
    async sendInvoice(input) { recoveredPayload = input.payload; return { messageId: 'invoice-recovered' }; },
    async sendMessage() {},
    async answerPreCheckoutQuery(input) { answered = input.ok; },
    async inquireTransaction(transactionId) { return { id: transactionId, status: 'paid', userId: 'bale-recovery-user', amount: order.totalTomans * 10 }; },
    async setWebhook() {}, async getWebhookInfo() { return { url: '' }; },
  };
  await processBaleWebhookUpdate({ update_id: 7302, message: { text: `/start ${recoveryToken}`, chat: { id: 'other-bale-user', type: 'private' }, from: { id: 'other-bale-user', is_bot: false } } }, replayClient);
  assert.equal(recoveredPayload, '');
  await processBaleWebhookUpdate({ update_id: 7303, message: { text: `/start ${recoveryToken}`, chat: { id: 'bale-recovery-user', type: 'private' }, from: { id: 'bale-recovery-user', is_bot: false } } }, replayClient);
  assert.equal(recoveredPayload, firstPayload);
  await processBaleWebhookUpdate({ update_id: 7304, pre_checkout_query: { id: 'bale-tx-recovery', from: { id: 'bale-recovery-user' }, currency: 'IRR', total_amount: order.totalTomans * 10, invoice_payload: recoveredPayload } }, replayClient);
  assert.equal(answered, true);
  await processBaleWebhookUpdate({ update_id: 7305, message: { chat: { id: 'bale-recovery-user', type: 'private' }, from: { id: 'bale-recovery-user', is_bot: false }, successful_payment: {
    currency: 'IRR', total_amount: order.totalTomans * 10, invoice_payload: recoveredPayload,
    telegram_payment_charge_id: 'bale-tx-recovery', provider_payment_charge_id: 'provider-ref-recovery',
  } } }, replayClient);
  assert.equal((await customer.get(`/api/v1/orders/${order.id}`).expect(200)).body.order.paymentStatus, 'paid');
  assert.equal(countRows("select count(*) as total from stock_movements where reference_id=? and movement_type='sale_committed'", order.id), 1);
});

test('Bale transaction mismatch never replaces the pre-checkout transaction ID or marks the order paid', async () => {
  const order = await makeOrder('phase3-bale-mismatch-order-001');
  const created = await customer.post(`/api/v1/orders/${order.id}/payments/bale`).set('Origin', origin)
    .set('X-Forwarded-For', '203.0.113.74').set('Idempotency-Key', 'phase3-bale-mismatch-attempt-001').send({}).expect(201);
  const attemptId = created.body.attempt.id as string;
  const token = new URL(created.body.paymentUrl).searchParams.get('start')!;
  let payload = '';
  const client: BaleClient = {
    async sendInvoice(input) { payload = input.payload; return { messageId: 'invoice-mismatch' }; },
    async sendMessage() {},
    async answerPreCheckoutQuery() {},
    async inquireTransaction(transactionId) { return { id: transactionId, status: 'paid', userId: 'bale-user-mismatch', amount: order.totalTomans * 10 }; },
    async setWebhook() {},
    async getWebhookInfo() { return { url: '' }; },
  };
  await processBaleWebhookUpdate({ update_id: 7101, message: { text: `/start ${token}`, chat: { id: 'bale-user-mismatch', type: 'private' }, from: { id: 'bale-user-mismatch', is_bot: false } } }, client);
  await processBaleWebhookUpdate({ update_id: 7102, pre_checkout_query: { id: 'expected-bale-transaction', from: { id: 'bale-user-mismatch' }, currency: 'IRR', total_amount: order.totalTomans * 10, invoice_payload: payload } }, client);
  const mismatched = { update_id: 7103, message: { chat: { id: 'bale-user-mismatch', type: 'private' }, from: { id: 'bale-user-mismatch', is_bot: false }, successful_payment: {
    currency: 'IRR', total_amount: order.totalTomans * 10, invoice_payload: payload,
    telegram_payment_charge_id: 'unexpected-bale-transaction', provider_payment_charge_id: 'provider-mismatch',
  } } };
  await processBaleWebhookUpdate(mismatched, client);
  const attempt = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get()!;
  assert.equal(attempt.externalTransactionId, 'expected-bale-transaction');
  assert.equal(attempt.status, 'pending_verification');
  assert.equal(db.select().from(orders).where(eq(orders.id, order.id)).get()!.paymentStatus, 'pending');
  assert.throws(() => getBaleReverificationContext(attemptId), (error: unknown) => typeof error === 'object' && error !== null && 'status' in error && error.status === 409);
  await expirePaymentAttempt(attemptId, 'Phase 3 mismatch test cleanup');
  await ownerAgent.post(`/api/v1/admin/orders/${order.id}/cancel`).set('Origin', origin).send({ reason: 'Phase 3 isolated mismatch test cleanup' }).expect(200);
});

test('customer and staff payment APIs expose real records only and require authorized roles', async () => {
  await request(app).get('/api/v1/admin/payments').expect(401);
  await supportAgent.get('/api/v1/admin/payments').expect(403);
  const list = await financeAgent.get('/api/v1/admin/payments?method=bale_wallet').expect(200);
  assert.ok(list.body.pagination.total >= 1);
  assert.equal(list.body.payments.some((payment: { method: string }) => payment.method !== 'bale_wallet'), false);
  await financeAgent.get(`/api/v1/admin/payments/${cardAttemptId}`).expect(200);
  await otherCustomer.get(`/api/v1/payments/${cardAttemptId}/status`).expect(404);
  assert.ok(countRows("select count(*) as total from payment_events where source='bale'") > 0);
});

after(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
