import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, isNull, sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { RunResult } from 'better-sqlite3';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { config, isBalePaymentConfigured } from '../../config';
import { db, sqlite } from '../../db/connection';
import {
  balePaymentSessions, baleStartTokens, baleWebhookUpdates, inventory, inventoryReservations,
  manualPaymentReceipts, orderEvents, orders, paymentAttempts, paymentEvents,
  paymentMethodConfigs, stockMovements, users,
} from '../../db/schema';
import * as schema from '../../db/schema';
import { ApiError } from '../../lib/errors';

const activeAttemptStatuses = ['created', 'awaiting_customer', 'pending_verification'] as const;
type PaymentExecutor = typeof db | SQLiteTransaction<'sync', RunResult, typeof schema, ExtractTablesWithRelations<typeof schema>>;
const idempotencySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const toDigits = (value: string) => value
  .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
  .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660));

export function normalizeIranianCardNumber(value: string) {
  return toDigits(value).replace(/[\s-]/g, '');
}

export function isValidIranianCardNumber(value: string) {
  if (!/^\d{16}$/.test(value) || /^0+$/.test(value)) return false;
  let sum = 0;
  for (let index = value.length - 1, position = 0; index >= 0; index--, position++) {
    let digit = Number(value[index]);
    if (position % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 - ').trim().replace(/\s-$/, '');
}

export function tomanToRial(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > Math.floor(2_147_483_647 / 10)) {
    throw new ApiError(422, 'PAYMENT_AMOUNT_UNSUPPORTED', 'مبلغ سفارش برای پرداخت کیف پول بله در بازه مجاز نیست.');
  }
  return value * 10;
}

const cardSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  bankName: z.string().trim().max(100).nullable().optional(),
  cardholderName: z.string().trim().max(120).nullable().optional(),
  cardNumber: z.string().max(40).optional(),
  accountIban: z.string().trim().max(40).nullable().optional(),
  instructions: z.string().trim().max(1200).nullable().optional(),
  manualReviewMessage: z.string().trim().max(500).nullable().optional(),
  manualReviewHoldHours: z.number().int().min(1).max(72).nullable().optional(),
}).refine(value => Object.keys(value).length > 0);

const baleSettingsSchema = z.object({ enabled: z.boolean() });
const cardSettingsDefault = {
  enabled: false,
  bankName: null as string | null,
  cardholderName: null as string | null,
  cardNumber: null as string | null,
  accountIban: null as string | null,
  instructions: null as string | null,
  manualReviewMessage: null as string | null,
  manualReviewHoldHours: null as number | null,
};

function getCardSettings(executor: PaymentExecutor = db) {
  return executor.select().from(paymentMethodConfigs).where(eq(paymentMethodConfigs.method, 'card_to_card')).get() ?? {
    method: 'card_to_card', ...cardSettingsDefault, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

function getBaleSettings(executor: PaymentExecutor = db) {
  return executor.select().from(paymentMethodConfigs).where(eq(paymentMethodConfigs.method, 'bale_wallet')).get() ?? {
    method: 'bale_wallet', enabled: false, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

export function getAdminPaymentSettings() {
  const card = getCardSettings();
  const bale = getBaleSettings();
  const cardConfigured = Boolean(card.cardNumber && card.cardholderName && card.manualReviewHoldHours);
  const baleConfigured = isBalePaymentConfigured();
  return {
    methods: {
      card_to_card: {
        enabled: card.enabled && cardConfigured,
        configured: cardConfigured,
        bankName: card.bankName,
        cardholderName: card.cardholderName,
        cardNumber: card.cardNumber,
        accountIban: card.accountIban,
        instructions: card.instructions,
        manualReviewMessage: card.manualReviewMessage,
        manualReviewHoldHours: card.manualReviewHoldHours,
      },
      bale_wallet: {
        enabled: bale.enabled && baleConfigured,
        configured: baleConfigured,
        botUsername: baleConfigured ? config.BALE_BOT_USERNAME : null,
      },
    },
  };
}

export function updateCardPaymentSettings(input: unknown) {
  const patch = cardSettingsSchema.parse(input);
  const current = getCardSettings();
  const next = {
    enabled: patch.enabled ?? current.enabled,
    bankName: patch.bankName === undefined ? current.bankName : patch.bankName?.trim() || null,
    cardholderName: patch.cardholderName === undefined ? current.cardholderName : patch.cardholderName?.trim() || null,
    cardNumber: patch.cardNumber === undefined ? current.cardNumber : normalizeIranianCardNumber(patch.cardNumber),
    accountIban: patch.accountIban === undefined ? current.accountIban : (patch.accountIban?.toUpperCase().replace(/[\s-]/g, '') || null),
    instructions: patch.instructions === undefined ? current.instructions : patch.instructions?.trim() || null,
    manualReviewMessage: patch.manualReviewMessage === undefined ? current.manualReviewMessage : patch.manualReviewMessage?.trim() || null,
    manualReviewHoldHours: patch.manualReviewHoldHours === undefined ? current.manualReviewHoldHours : patch.manualReviewHoldHours,
  };
  if (next.accountIban && !/^IR\d{24}$/.test(toDigits(next.accountIban))) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'شماره شبا باید شامل پیش‌شماره ایران و ۲۴ رقم باشد.');
  }
  if (next.enabled) {
    if (!next.cardholderName || !next.cardNumber || !isValidIranianCardNumber(next.cardNumber)) {
      throw new ApiError(422, 'CARD_CONFIGURATION_REQUIRED', 'برای فعال‌کردن کارت‌به‌کارت، نام صاحب کارت و شماره کارت معتبر لازم است.');
    }
    if (!next.manualReviewHoldHours) {
      throw new ApiError(422, 'REVIEW_HOLD_REQUIRED', 'مهلت بررسی رسید را پیش از فعال‌سازی تعیین کنید.');
    }
  }
  const now = new Date();
  db.insert(paymentMethodConfigs).values({ method: 'card_to_card', ...next, createdAt: current.createdAt.getTime() ? current.createdAt : now, updatedAt: now })
    .onConflictDoUpdate({ target: paymentMethodConfigs.method, set: { ...next, updatedAt: now } }).run();
  return getAdminPaymentSettings();
}

export function updateBalePaymentSettings(input: unknown, webhookVerified = false) {
  const { enabled } = baleSettingsSchema.parse(input);
  if (enabled && !isBalePaymentConfigured()) {
    throw new ApiError(409, 'BALE_CREDENTIALS_MISSING', 'تنظیمات امن ربات بله روی سرور کامل نیست.');
  }
  if (enabled && !webhookVerified) {
    throw new ApiError(409, 'BALE_WEBHOOK_UNVERIFIED', 'وب‌هوک بله هنوز ثبت و تأیید نشده است.');
  }
  const current = getBaleSettings();
  const now = new Date();
  db.insert(paymentMethodConfigs).values({ method: 'bale_wallet', enabled, createdAt: current.createdAt?.getTime?.() ? current.createdAt : now, updatedAt: now })
    .onConflictDoUpdate({ target: paymentMethodConfigs.method, set: { enabled, updatedAt: now } }).run();
  return getAdminPaymentSettings();
}

function addPaymentEvent(executor: PaymentExecutor, input: {
  paymentAttemptId: string; eventType: string; source: string; externalEventId?: string | null;
  metadata?: Record<string, unknown> | null; createdAt?: Date;
}) {
  executor.insert(paymentEvents).values({
    paymentAttemptId: input.paymentAttemptId, eventType: input.eventType, source: input.source,
    externalEventId: input.externalEventId ?? null, metadataSafeJson: input.metadata ?? null,
    createdAt: input.createdAt ?? new Date(),
  }).onConflictDoNothing().run();
}

function getOwnedOrder(userId: string, orderId: string, executor: PaymentExecutor = db) {
  const order = executor.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).get();
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
  return order;
}

function activeReservations(orderId: string, now: Date, executor: PaymentExecutor = db) {
  const reservations = executor.select().from(inventoryReservations)
    .where(and(eq(inventoryReservations.orderId, orderId), eq(inventoryReservations.status, 'active'))).all();
  return reservations.length && reservations.every(row => row.expiresAt > now) ? reservations : [];
}

function assertPayableOrder(userId: string, orderId: string, now: Date, executor: PaymentExecutor = db) {
  const order = getOwnedOrder(userId, orderId, executor);
  if (order.orderStatus !== 'awaiting_payment' || !['unpaid', 'pending'].includes(order.paymentStatus)) {
    throw new ApiError(409, 'ORDER_NOT_PAYABLE', 'این سفارش در حال حاضر قابل پرداخت نیست.');
  }
  const reservations = activeReservations(order.id, now, executor);
  if (!reservations.length) throw new ApiError(409, 'RESERVATION_EXPIRED', 'مهلت رزرو موجودی این سفارش به پایان رسیده است.');
  return { order, reservations };
}

function activeAttemptsForOrder(orderId: string, executor: PaymentExecutor = db) {
  return executor.select().from(paymentAttempts).where(and(
    eq(paymentAttempts.orderId, orderId), inArray(paymentAttempts.status, [...activeAttemptStatuses]),
  )).orderBy(desc(paymentAttempts.createdAt)).all();
}

function formatCardSettings(settings: ReturnType<typeof getCardSettings>) {
  return {
    bankName: settings.bankName,
    cardholderName: settings.cardholderName,
    cardNumber: settings.cardNumber,
    formattedCardNumber: settings.cardNumber ? formatCardNumber(settings.cardNumber) : null,
    accountIban: settings.accountIban,
    instructions: settings.instructions,
    manualReviewMessage: settings.manualReviewMessage,
    manualReviewHoldHours: settings.manualReviewHoldHours,
  };
}

function enabledCustomerPaymentMethods(): Array<Record<string, unknown>> {
  const methods: Array<Record<string, unknown>> = [];
  const card = getCardSettings();
  if (card.enabled && card.cardNumber && card.cardholderName && card.manualReviewHoldHours && isValidIranianCardNumber(card.cardNumber)) {
    methods.push({ method: 'card_to_card', title: 'کارت‌به‌کارت', description: 'واریز بانکی و تأیید دستی', ...formatCardSettings(card) });
  }
  const bale = getBaleSettings();
  if (bale.enabled && isBalePaymentConfigured()) {
    methods.push({ method: 'bale_wallet', title: 'پرداخت با بله', description: 'پرداخت از طریق کیف پول بله', botUsername: config.BALE_BOT_USERNAME });
  }
  return methods;
}

export function listPublicPaymentMethods() {
  const methods = enabledCustomerPaymentMethods().map(({ method, title, description }) => ({ method, title, description }));
  return { methods, ...(methods.length ? {} : { unavailableReason: 'NO_ACTIVE_PAYMENT_METHOD' }) };
}

export function getCustomerPaymentOptions(userId: string, orderId: string) {
  const order = getOwnedOrder(userId, orderId);
  const now = new Date();
  const active = activeAttemptsForOrder(order.id);
  if (order.orderStatus !== 'awaiting_payment' || order.paymentStatus === 'paid' || order.paymentStatus === 'cancelled') {
    return { order: { id: order.id, orderNumber: order.orderNumber, totalTomans: order.totalTomans, paymentStatus: order.paymentStatus }, methods: [], activeAttempt: null };
  }
  if (!activeReservations(order.id, now).length) {
    return { order: { id: order.id, orderNumber: order.orderNumber, totalTomans: order.totalTomans, paymentStatus: order.paymentStatus }, methods: [], activeAttempt: null, unavailableReason: 'RESERVATION_EXPIRED' };
  }
  if (active.length) {
    const activeDto = customerAttemptDto(active[0]);
    const baleSession = active[0].method === 'bale_wallet'
      ? db.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, active[0].id)).get()
      : undefined;
    return {
      order: { id: order.id, orderNumber: order.orderNumber, totalTomans: order.totalTomans, paymentStatus: order.paymentStatus },
      methods: [], activeAttempt: { ...activeDto, ...(baleSession ? { baleInvoiceStatus: baleSession.invoiceStatus } : {}) },
    };
  }
  const methods = enabledCustomerPaymentMethods();
  return {
    order: { id: order.id, orderNumber: order.orderNumber, totalTomans: order.totalTomans, paymentStatus: order.paymentStatus },
    methods,
    activeAttempt: null,
    ...(methods.length ? {} : { unavailableReason: 'NO_ACTIVE_PAYMENT_METHOD' }),
  };
}

export function customerAttemptDto(attempt: typeof paymentAttempts.$inferSelect) {
  return {
    id: attempt.id,
    orderId: attempt.orderId,
    method: attempt.method,
    status: attempt.status,
    amountTomans: attempt.amountTomans,
    amountProviderUnits: attempt.amountProviderUnits,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    expiresAt: attempt.expiresAt,
    paidAt: attempt.paidAt,
    failureCode: attempt.failureCode,
    failureMessage: attempt.failureMessage,
    methodSnapshot: attempt.methodSnapshot,
  };
}

function assertNoActiveAttempt(orderId: string, executor: PaymentExecutor = db) {
  const existing = activeAttemptsForOrder(orderId, executor)[0];
  if (existing) throw new ApiError(409, 'PAYMENT_ATTEMPT_ACTIVE', 'یک روش پرداخت برای این سفارش در حال انجام است.');
}

function idempotentAttempt(key: string, orderId: string, method: string) {
  const parsed = idempotencySchema.parse(key);
  const existing = db.select().from(paymentAttempts).where(eq(paymentAttempts.idempotencyKey, parsed)).get();
  if (!existing) return undefined;
  if (existing.orderId !== orderId || existing.method !== method) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'کلید ثبت پرداخت برای درخواست دیگری استفاده شده است.');
  return existing;
}

function issueBaleStartLink(attempt: typeof paymentAttempts.$inferSelect, now: Date) {
  return db.transaction(tx => {
    const session = tx.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get();
    const canStart = session && ((session.invoiceStatus === 'not_sent' && !session.claimedAt)
      || (session.invoiceStatus === 'unknown' && Boolean(session.invoicePayload && session.baleUserId && session.baleChatId)));
    if (!session || !canStart || !attempt.expiresAt || attempt.expiresAt <= now) {
      return { paymentUrl: null, invoiceStatus: session?.invoiceStatus ?? 'unknown' };
    }
    const token = randomBytes(32).toString('base64url');
    tx.insert(baleStartTokens).values({ paymentAttemptId: attempt.id,
      tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: attempt.expiresAt, createdAt: now }).run();
    return {
      paymentUrl: `https://ble.ir/${encodeURIComponent(config.BALE_BOT_USERNAME)}?start=${encodeURIComponent(token)}`,
      invoiceStatus: session.invoiceStatus,
    };
  }, { behavior: 'immediate' });
}

export function createCardToCardAttempt(userId: string, orderId: string, idempotencyKey: string) {
  const key = idempotencySchema.parse(idempotencyKey);
  getOwnedOrder(userId, orderId);
  const replay = idempotentAttempt(key, orderId, 'card_to_card');
  if (replay) return { attempt: customerAttemptDto(replay), card: replay.methodSnapshot };
  const now = new Date();
  const result = db.transaction(tx => {
    const { order, reservations } = assertPayableOrder(userId, orderId, now, tx);
    assertNoActiveAttempt(order.id, tx);
    const settings = getCardSettings(tx);
    if (!settings.enabled || !settings.cardNumber || !settings.cardholderName || !settings.manualReviewHoldHours
      || !isValidIranianCardNumber(settings.cardNumber)) {
      throw new ApiError(409, 'PAYMENT_METHOD_UNAVAILABLE', 'روش کارت‌به‌کارت در حال حاضر فعال نیست.');
    }
    const expiresAt = reservations.reduce((earliest, item) => item.expiresAt < earliest ? item.expiresAt : earliest, reservations[0].expiresAt);
    const card = formatCardSettings(settings);
    const attempt = tx.insert(paymentAttempts).values({
      orderId: order.id, method: 'card_to_card', status: 'awaiting_customer', amountTomans: order.totalTomans,
      amountProviderUnits: null, idempotencyKey: key, methodSnapshot: card, expiresAt, createdAt: now, updatedAt: now,
    }).returning().get();
    tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, order.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'attempt_created', source: 'customer', metadata: { method: attempt.method, amountTomans: attempt.amountTomans }, createdAt: now });
    tx.insert(orderEvents).values({ orderId: order.id, eventType: 'payment_pending', actorType: 'customer', actorUserId: userId,
      previousValue: 'unpaid', newValue: 'pending', note: 'درخواست پرداخت کارت‌به‌کارت ایجاد شد.', metadata: { paymentAttemptId: attempt.id }, createdAt: now }).run();
    return attempt;
  }, { behavior: 'immediate' });
  return { attempt: customerAttemptDto(result), card: result.methodSnapshot };
}

export function createBaleAttempt(userId: string, orderId: string, idempotencyKey: string) {
  const key = idempotencySchema.parse(idempotencyKey);
  if (!isBalePaymentConfigured()) throw new ApiError(409, 'BALE_CREDENTIALS_MISSING', 'پرداخت با بله در حال حاضر قابل استفاده نیست.');
  getOwnedOrder(userId, orderId);
  const replay = idempotentAttempt(key, orderId, 'bale_wallet');
  const now = new Date();
  let attempt = replay;
  if (!attempt) {
    attempt = db.transaction(tx => {
      const { order, reservations } = assertPayableOrder(userId, orderId, now, tx);
      assertNoActiveAttempt(order.id, tx);
      const bale = getBaleSettings(tx);
      if (!bale.enabled) throw new ApiError(409, 'PAYMENT_METHOD_UNAVAILABLE', 'روش کیف پول بله در حال حاضر فعال نیست.');
      const amountProviderUnits = tomanToRial(order.totalTomans);
      const expiresAt = reservations.reduce((earliest, item) => item.expiresAt < earliest ? item.expiresAt : earliest, reservations[0].expiresAt);
      const created = tx.insert(paymentAttempts).values({
        orderId: order.id, method: 'bale_wallet', status: 'awaiting_customer', amountTomans: order.totalTomans,
        amountProviderUnits, idempotencyKey: key, methodSnapshot: { method: 'bale_wallet', title: 'پرداخت با کیف پول بله' },
        expiresAt, createdAt: now, updatedAt: now,
      }).returning().get();
      const unusedPayloadHash = createHash('sha256').update(randomBytes(32)).digest('hex');
      tx.insert(balePaymentSessions).values({ paymentAttemptId: created.id, invoicePayloadHash: unusedPayloadHash, invoiceStatus: 'not_sent', createdAt: now, updatedAt: now }).run();
      tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, order.id)).run();
      addPaymentEvent(tx, { paymentAttemptId: created.id, eventType: 'attempt_created', source: 'customer', metadata: { method: created.method, amountTomans: created.amountTomans, amountProviderUnits }, createdAt: now });
      tx.insert(orderEvents).values({ orderId: order.id, eventType: 'payment_pending', actorType: 'customer', actorUserId: userId,
        previousValue: 'unpaid', newValue: 'pending', note: 'درخواست پرداخت کیف پول بله ایجاد شد.', metadata: { paymentAttemptId: created.id }, createdAt: now }).run();
      return created;
    }, { behavior: 'immediate' });
  }
  if (attempt.status !== 'awaiting_customer' || !attempt.expiresAt || attempt.expiresAt <= now) {
    throw new ApiError(409, 'PAYMENT_ATTEMPT_EXPIRED', 'مهلت این روش پرداخت به پایان رسیده است.');
  }
  const link = issueBaleStartLink(attempt, now);
  return {
    attempt: customerAttemptDto(attempt),
    ...link,
  };
}

export function createBalePaymentLink(userId: string, attemptId: string) {
  const attempt = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
  if (!attempt || attempt.method !== 'bale_wallet') throw new ApiError(404, 'NOT_FOUND', 'درخواست پرداخت پیدا نشد.');
  const order = getOwnedOrder(userId, attempt.orderId);
  const now = new Date();
  if (attempt.status !== 'awaiting_customer' || !attempt.expiresAt || attempt.expiresAt <= now
    || order.orderStatus !== 'awaiting_payment' || order.paymentStatus !== 'pending' || !activeReservations(order.id, now).length) {
    throw new ApiError(409, 'PAYMENT_ATTEMPT_EXPIRED', 'مهلت این روش پرداخت به پایان رسیده است.');
  }
  return issueBaleStartLink(attempt, now);
}

export function getCustomerPaymentStatus(userId: string, attemptId: string) {
  const attempt = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'وضعیت پرداخت پیدا نشد.');
  const order = getOwnedOrder(userId, attempt.orderId);
  const receipts = db.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.paymentAttemptId, attempt.id))
    .orderBy(desc(manualPaymentReceipts.uploadedAt)).all();
  const baleSession = attempt.method === 'bale_wallet'
    ? db.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get()
    : undefined;
  return {
    attempt: { ...customerAttemptDto(attempt), ...(baleSession ? { baleInvoiceStatus: baleSession.invoiceStatus } : {}) },
    order: { id: order.id, orderNumber: order.orderNumber, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
    receipt: receipts[0] ? { id: receipts[0].id, reviewStatus: receipts[0].reviewStatus, uploadedAt: receipts[0].uploadedAt,
      reviewNote: receipts[0].reviewStatus === 'rejected' ? receipts[0].reviewNote : null } : null,
  };
}

export function assertReceiptUploadAllowed(userId: string, attemptId: string) {
  const attempt = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
  if (!attempt || attempt.method !== 'card_to_card') throw new ApiError(404, 'NOT_FOUND', 'درخواست پرداخت پیدا نشد.');
  const order = getOwnedOrder(userId, attempt.orderId);
  if (order.orderStatus !== 'awaiting_payment' || order.paymentStatus === 'paid' || attempt.status !== 'awaiting_customer') {
    throw new ApiError(409, 'PAYMENT_NOT_ACCEPTING_RECEIPTS', 'این درخواست پرداخت در حال حاضر رسید جدید نمی‌پذیرد.');
  }
  const settings = getCardSettings();
  if (!settings.enabled || !settings.manualReviewHoldHours) throw new ApiError(409, 'PAYMENT_METHOD_UNAVAILABLE', 'روش کارت‌به‌کارت در حال حاضر فعال نیست.');
  if (!activeReservations(order.id, new Date()).length) throw new ApiError(409, 'RESERVATION_EXPIRED', 'مهلت رزرو موجودی این سفارش به پایان رسیده است.');
  if (db.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.paymentAttemptId, attempt.id), eq(manualPaymentReceipts.reviewStatus, 'pending'))).get()) {
    throw new ApiError(409, 'RECEIPT_ALREADY_PENDING', 'رسید قبلی هنوز بررسی نشده است.');
  }
}

export interface NormalizedReceipt {
  storageKey: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
}

export function recordReceiptUpload(userId: string, attemptId: string, receipt: NormalizedReceipt) {
  const now = new Date();
  return db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || attempt.method !== 'card_to_card') throw new ApiError(404, 'NOT_FOUND', 'درخواست پرداخت پیدا نشد.');
    const order = getOwnedOrder(userId, attempt.orderId, tx);
    if (order.orderStatus !== 'awaiting_payment' || order.paymentStatus === 'paid' || attempt.status !== 'awaiting_customer') {
      throw new ApiError(409, 'PAYMENT_NOT_ACCEPTING_RECEIPTS', 'این درخواست پرداخت در حال حاضر رسید جدید نمی‌پذیرد.');
    }
    const settings = getCardSettings(tx);
    if (!settings.enabled || !settings.manualReviewHoldHours) throw new ApiError(409, 'PAYMENT_METHOD_UNAVAILABLE', 'روش کارت‌به‌کارت در حال حاضر فعال نیست.');
    const active = activeReservations(order.id, now, tx);
    if (!active.length) throw new ApiError(409, 'RESERVATION_EXPIRED', 'مهلت رزرو موجودی این سفارش به پایان رسیده است.');
    if (tx.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.paymentAttemptId, attempt.id), eq(manualPaymentReceipts.reviewStatus, 'pending'))).get()) {
      throw new ApiError(409, 'RECEIPT_ALREADY_PENDING', 'رسید قبلی هنوز بررسی نشده است.');
    }
    const holdUntil = new Date(now.getTime() + settings.manualReviewHoldHours * 3600_000);
    const created = tx.insert(manualPaymentReceipts).values({ paymentAttemptId: attempt.id, ...receipt, uploadedAt: now, reviewStatus: 'pending' }).returning().get();
    tx.update(paymentAttempts).set({ status: 'pending_verification', expiresAt: holdUntil, updatedAt: now }).where(eq(paymentAttempts.id, attempt.id)).run();
    tx.update(inventoryReservations).set({ expiresAt: holdUntil }).where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active'))).run();
    tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, order.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'receipt_uploaded', source: 'customer', metadata: { receiptId: created.id, mimeType: receipt.mimeType, sizeBytes: receipt.sizeBytes, sha256: receipt.sha256 }, createdAt: now });
    tx.insert(orderEvents).values({ orderId: order.id, eventType: 'payment_receipt_submitted', actorType: 'customer', actorUserId: userId,
      previousValue: 'awaiting_customer', newValue: 'pending_verification', note: 'رسید پرداخت ثبت شد و در انتظار بررسی است.', metadata: { paymentAttemptId: attempt.id }, createdAt: now }).run();
    return { attempt: customerAttemptDto(tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attempt.id)).get()!), receipt: { id: created.id, reviewStatus: created.reviewStatus, uploadedAt: created.uploadedAt } };
  }, { behavior: 'immediate' });
}

const approvalSchema = z.object({ acknowledged: z.literal(true) });
const rejectionSchema = z.object({ reason: z.string().trim().min(2).max(500) });

export function approveCardPayment(attemptId: string, staffId: string, input: unknown) {
  approvalSchema.parse(input);
  const now = new Date();
  return db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || attempt.method !== 'card_to_card') throw new ApiError(404, 'NOT_FOUND', 'پرداخت پیدا نشد.');
    if (attempt.status === 'verified') return { attempt: customerAttemptDto(attempt), idempotent: true };
    if (attempt.status !== 'pending_verification') throw new ApiError(409, 'PAYMENT_NOT_REVIEWABLE', 'این پرداخت در صف بررسی نیست.');
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
    if (order.paymentStatus === 'paid' || order.orderStatus !== 'awaiting_payment') throw new ApiError(409, 'ORDER_ALREADY_PAID_OR_CLOSED', 'این سفارش قبلاً پرداخت شده یا بسته شده است.');
    if (!attempt.expiresAt || attempt.expiresAt <= now) throw new ApiError(409, 'REVIEW_HOLD_EXPIRED', 'مهلت بررسی پرداخت پایان یافته است.');
    const receipt = tx.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.paymentAttemptId, attempt.id), eq(manualPaymentReceipts.reviewStatus, 'pending'))).orderBy(desc(manualPaymentReceipts.uploadedAt)).get();
    if (!receipt) throw new ApiError(409, 'PENDING_RECEIPT_REQUIRED', 'رسید در انتظار بررسی برای این پرداخت ثبت نشده است.');
    const reservations = tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active'))).all();
    if (!reservations.length || reservations.some(row => row.expiresAt <= now)) throw new ApiError(409, 'RESERVATION_EXPIRED', 'رزرو موجودی پیش از تأیید پرداخت پایان یافته است.');
    for (const reservation of reservations) {
      const before = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get();
      if (!before || before.reserved < reservation.quantity || before.onHand < reservation.quantity) throw new ApiError(409, 'INVENTORY_RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
      const changed = tx.update(inventory).set({ onHand: sql`${inventory.onHand} - ${reservation.quantity}`, reserved: sql`${inventory.reserved} - ${reservation.quantity}`, updatedAt: now })
        .where(and(eq(inventory.variantId, reservation.variantId), sql`${inventory.onHand} >= ${reservation.quantity} and ${inventory.reserved} >= ${reservation.quantity}`)).run();
      if (!changed.changes) throw new ApiError(409, 'INVENTORY_RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
      tx.update(inventoryReservations).set({ status: 'consumed', consumedAt: now }).where(and(eq(inventoryReservations.id, reservation.id), eq(inventoryReservations.status, 'active'))).run();
      const after = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get()!;
      tx.insert(stockMovements).values({ variantId: reservation.variantId, movementType: 'sale_committed', quantityDelta: -reservation.quantity,
        onHandBefore: before.onHand, onHandAfter: after.onHand, referenceType: 'order', referenceId: order.id,
        reason: `Card payment verified for ${order.orderNumber}`, actorStaffId: staffId, createdAt: now }).run();
    }
    tx.update(manualPaymentReceipts).set({ reviewStatus: 'approved', reviewedByStaffId: staffId, reviewedAt: now, reviewNote: null }).where(eq(manualPaymentReceipts.id, receipt.id)).run();
    tx.update(paymentAttempts).set({ status: 'verified', paidAt: now, updatedAt: now, failureCode: null, failureMessage: null }).where(eq(paymentAttempts.id, attempt.id)).run();
    tx.update(orders).set({ paymentStatus: 'paid', orderStatus: 'confirmed', updatedAt: now }).where(eq(orders.id, order.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'manual_payment_approved', source: 'staff', metadata: { staffId, receiptId: receipt.id, amountTomans: attempt.amountTomans }, createdAt: now });
    tx.insert(orderEvents).values({ orderId: order.id, eventType: 'payment_verified', actorType: 'staff', actorStaffId: staffId,
      previousValue: 'pending', newValue: 'paid', note: 'پرداخت کارت‌به‌کارت پس از تطبیق بانکی تأیید شد.', metadata: { paymentAttemptId: attempt.id }, createdAt: now }).run();
    const updated = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attempt.id)).get()!;
    return { attempt: customerAttemptDto(updated), idempotent: false };
  }, { behavior: 'immediate' });
}

export function rejectCardPayment(attemptId: string, staffId: string, input: unknown) {
  const { reason } = rejectionSchema.parse(input);
  const now = new Date();
  return db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || attempt.method !== 'card_to_card') throw new ApiError(404, 'NOT_FOUND', 'پرداخت پیدا نشد.');
    if (attempt.status === 'rejected') return { attempt: customerAttemptDto(attempt), idempotent: true };
    if (attempt.status !== 'pending_verification') throw new ApiError(409, 'PAYMENT_NOT_REVIEWABLE', 'این پرداخت در صف بررسی نیست.');
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
    const receipt = tx.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.paymentAttemptId, attempt.id), eq(manualPaymentReceipts.reviewStatus, 'pending'))).orderBy(desc(manualPaymentReceipts.uploadedAt)).get();
    if (!receipt) throw new ApiError(409, 'PENDING_RECEIPT_REQUIRED', 'رسید در انتظار بررسی برای این پرداخت ثبت نشده است.');
    tx.update(manualPaymentReceipts).set({ reviewStatus: 'rejected', reviewedByStaffId: staffId, reviewedAt: now, reviewNote: reason }).where(eq(manualPaymentReceipts.id, receipt.id)).run();
    tx.update(paymentAttempts).set({ status: 'rejected', failedAt: now, updatedAt: now, failureCode: 'MANUAL_REJECTED', failureMessage: reason }).where(eq(paymentAttempts.id, attempt.id)).run();
    const otherActive = tx.select({ id: paymentAttempts.id }).from(paymentAttempts).where(and(eq(paymentAttempts.orderId, order.id), inArray(paymentAttempts.status, [...activeAttemptStatuses]))).all();
    if (order.paymentStatus !== 'paid' && order.orderStatus === 'awaiting_payment') {
      tx.update(orders).set({ paymentStatus: otherActive.length ? 'pending' : 'unpaid', updatedAt: now }).where(eq(orders.id, order.id)).run();
    }
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'manual_payment_rejected', source: 'staff', metadata: { staffId, receiptId: receipt.id, reason }, createdAt: now });
    tx.insert(orderEvents).values({ orderId: order.id, eventType: 'payment_rejected', actorType: 'staff', actorStaffId: staffId,
      previousValue: 'pending_verification', newValue: 'rejected', note: reason, metadata: { paymentAttemptId: attempt.id }, createdAt: now }).run();
    return { attempt: customerAttemptDto(tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attempt.id)).get()!), idempotent: false };
  }, { behavior: 'immediate' });
}

export function getPaymentAttemptForBale(attemptId: string, executor: PaymentExecutor = db) {
  return executor.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
}

export function getBaleSessionByPayloadHash(payloadHash: string, executor: PaymentExecutor = db) {
  const session = executor.select().from(balePaymentSessions).where(eq(balePaymentSessions.invoicePayloadHash, payloadHash)).get();
  return session ? { session, attempt: getPaymentAttemptForBale(session.paymentAttemptId, executor) } : undefined;
}

export function getBaleReverificationContext(attemptId: string) {
  return db.transaction(tx => {
    let attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || attempt.method !== 'bale_wallet') throw new ApiError(404, 'NOT_FOUND', 'پرداخت بله پیدا نشد.');
    if (attempt.status !== 'pending_verification' || !attempt.externalTransactionId) {
      throw new ApiError(409, 'PAYMENT_NOT_RECHECKABLE', 'این پرداخت بله در حال حاضر نیازمند استعلام دوباره نیست.');
    }
    const session = tx.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get();
    const received = tx.select().from(paymentEvents).where(and(eq(paymentEvents.paymentAttemptId, attempt.id), eq(paymentEvents.eventType, 'bale_payment_received')))
      .orderBy(desc(paymentEvents.createdAt)).get();
    const metadata = received?.metadataSafeJson as Record<string, unknown> | null | undefined;
    if (!session || !metadata || typeof metadata.currency !== 'string' || typeof metadata.totalAmount !== 'number'
      || typeof metadata.transactionId !== 'string' || metadata.transactionId !== attempt.externalTransactionId) {
      throw new ApiError(409, 'PAYMENT_EVIDENCE_INCOMPLETE', 'اطلاعات استعلام پرداخت کامل نیست.');
    }
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
      const reservations = tx.select().from(inventoryReservations).where(and(
        eq(inventoryReservations.orderId, attempt.orderId), eq(inventoryReservations.status, 'active'),
      )).all();
      if (!reservations.length) throw new ApiError(409, 'RESERVATION_EXPIRED', 'رزرو موجودی سفارش پایان یافته است.');
      const holdUntil = new Date(Date.now() + config.CHECKOUT_RESERVATION_MINUTES * 60_000);
      tx.update(paymentAttempts).set({ expiresAt: holdUntil, updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id)).run();
      tx.update(inventoryReservations).set({ expiresAt: holdUntil })
        .where(and(eq(inventoryReservations.orderId, attempt.orderId), eq(inventoryReservations.status, 'active'))).run();
      attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get()!;
    }
    return { attempt, session, received: { currency: metadata.currency, totalAmount: metadata.totalAmount, transactionId: metadata.transactionId,
      providerReference: typeof metadata.providerReference === 'string' ? metadata.providerReference : null } };
  }, { behavior: 'immediate' });
}

export function claimBaleStartToken(token: string, baleUserId: string, chatId: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();
  return db.transaction(tx => {
    const tokenRow = tx.select().from(baleStartTokens).where(eq(baleStartTokens.tokenHash, tokenHash)).get();
    if (!tokenRow || tokenRow.expiresAt <= now) return undefined;
    const attempt = getPaymentAttemptForBale(tokenRow.paymentAttemptId, tx);
    if (!attempt || attempt.method !== 'bale_wallet' || attempt.status !== 'awaiting_customer' || !attempt.expiresAt || attempt.expiresAt <= now) return undefined;
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    if (!order || order.orderStatus !== 'awaiting_payment' || order.paymentStatus !== 'pending' || !activeReservations(order.id, now, tx).length) return undefined;
    const session = tx.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get();
    if (!session) return undefined;
    const sameBaleIdentity = session.baleUserId === baleUserId && session.baleChatId === chatId;
    if (tokenRow.claimedAt) {
      if (sameBaleIdentity && ['sending', 'sent'].includes(session.invoiceStatus)) return { kind: 'already_active' as const };
      if (session.invoiceStatus !== 'unknown' || !sameBaleIdentity || !session.invoicePayload) return undefined;
    } else if (session.invoiceStatus === 'not_sent' && !session.claimedAt) {
      // First claim binds this opaque invoice payload to the Bale identity.
    } else if (session.invoiceStatus === 'unknown' && sameBaleIdentity && session.invoicePayload) {
      // An ambiguous timeout may be retried only by the identity already bound to the attempt.
    } else return undefined;

    const retry = session.invoiceStatus === 'unknown';
    const invoicePayload = retry ? session.invoicePayload! : randomBytes(32).toString('base64url');
    const invoicePayloadHash = createHash('sha256').update(invoicePayload).digest('hex');
    tx.update(baleStartTokens).set({ claimedAt: now }).where(eq(baleStartTokens.id, tokenRow.id)).run();
    tx.update(balePaymentSessions).set({ invoicePayloadHash, invoicePayload, baleChatId: chatId, baleUserId,
      claimedAt: session.claimedAt ?? now, invoiceStatus: 'sending', updatedAt: now })
      .where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: retry ? 'bale_invoice_retry_started' : 'bale_start_claimed', source: 'bale', metadata: { baleUserId, chatId }, createdAt: now });
    return { kind: 'send' as const, attempt, order, invoicePayload, retry };
  }, { behavior: 'immediate' });
}

export function markBaleInvoiceSent(attemptId: string, messageId: string) {
  const now = new Date();
  db.transaction(tx => {
    tx.update(balePaymentSessions).set({ invoiceStatus: 'sent', invoiceMessageId: messageId, updatedAt: now }).where(eq(balePaymentSessions.paymentAttemptId, attemptId)).run();
    addPaymentEvent(tx, { paymentAttemptId: attemptId, eventType: 'bale_invoice_sent', source: 'bale', metadata: { messageId }, createdAt: now });
  }, { behavior: 'immediate' });
}

export function markBaleInvoiceError(attemptId: string, definitive: boolean, retry = false) {
  const now = new Date();
  db.transaction(tx => {
    const failed = definitive && !retry;
    tx.update(balePaymentSessions).set({ invoiceStatus: failed ? 'failed' : 'unknown', updatedAt: now }).where(eq(balePaymentSessions.paymentAttemptId, attemptId)).run();
    if (failed) {
      const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
      if (!attempt) return;
      tx.update(paymentAttempts).set({ status: 'failed', failedAt: now, updatedAt: now, failureCode: 'BALE_INVOICE_REJECTED', failureMessage: 'صورتحساب بله ارسال نشد.' }).where(eq(paymentAttempts.id, attempt.id)).run();
      const other = tx.select({ id: paymentAttempts.id }).from(paymentAttempts).where(and(eq(paymentAttempts.orderId, attempt.orderId), inArray(paymentAttempts.status, [...activeAttemptStatuses]))).all();
      if (!other.length) tx.update(orders).set({ paymentStatus: 'unpaid', updatedAt: now }).where(eq(orders.id, attempt.orderId)).run();
    }
    addPaymentEvent(tx, { paymentAttemptId: attemptId, eventType: failed ? 'payment_failed' : 'bale_invoice_delivery_unknown', source: 'bale', metadata: { failureCode: failed ? 'BALE_INVOICE_REJECTED' : 'BALE_INVOICE_DELIVERY_UNKNOWN', retry }, createdAt: now });
  }, { behavior: 'immediate' });
}

export function validateBalePreCheckout(input: { invoicePayload: string; currency: string; totalAmount: number; baleUserId: string; transactionId: string }) {
  const payloadHash = createHash('sha256').update(input.invoicePayload).digest('hex');
  const linked = getBaleSessionByPayloadHash(payloadHash);
  if (!linked?.attempt || linked.attempt.status !== 'awaiting_customer' || !['sending', 'sent', 'unknown'].includes(linked.session.invoiceStatus)
    || linked.session.baleUserId !== input.baleUserId || input.currency !== 'IRR'
    || input.totalAmount !== linked.attempt.amountProviderUnits
    || (linked.attempt.externalTransactionId !== null && linked.attempt.externalTransactionId !== input.transactionId)) return { ok: false as const, code: 'PRECHECKOUT_MISMATCH' };
  const order = db.select().from(orders).where(eq(orders.id, linked.attempt.orderId)).get();
  if (!order || order.orderStatus !== 'awaiting_payment' || order.paymentStatus !== 'pending'
    || order.totalTomans !== linked.attempt.amountTomans || !linked.attempt.expiresAt || linked.attempt.expiresAt <= new Date()
    || !activeReservations(order.id, new Date()).length) return { ok: false as const, code: 'ORDER_OR_RESERVATION_INVALID' };
  return { ok: true as const, attemptId: linked.attempt.id };
}

export function recordBalePreCheckout(attemptId: string, updateId: string, input: { currency: string; totalAmount: number; transactionId: string; approved: boolean }) {
  addPaymentEvent(db, { paymentAttemptId: attemptId, eventType: 'bale_precheckout_received', source: 'bale', externalEventId: `${updateId}:pre_checkout`,
    metadata: { currency: input.currency, totalAmount: input.totalAmount, transactionId: input.transactionId, approved: input.approved, updateId } });
}

export function recordBalePaymentReceived(attemptId: string, updateId: string, input: {
  currency: string; totalAmount: number; transactionId: string; providerReference: string | null;
  payloadReference: string; baleUserId: string | null;
}) {
  const now = new Date();
  db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || attempt.method !== 'bale_wallet' || attempt.status === 'verified') return;
    const session = tx.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get();
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'bale_payment_received', source: 'bale', externalEventId: `${updateId}:payment_received`,
      metadata: { currency: input.currency, totalAmount: input.totalAmount, transactionId: input.transactionId,
        providerReference: input.providerReference, payloadReference: input.payloadReference, baleUserId: input.baleUserId, updateId } });
    const transactionMatches = Boolean(session && order && session.baleUserId === input.baleUserId
      && attempt.externalTransactionId === input.transactionId && input.currency === 'IRR'
      && input.totalAmount === attempt.amountProviderUnits && input.payloadReference === session.invoicePayloadHash.slice(0, 16));
    if (transactionMatches && order && order.paymentStatus !== 'paid'
      && ['awaiting_customer', 'pending_verification'].includes(attempt.status)) {
      const holdUntil = new Date(now.getTime() + config.CHECKOUT_RESERVATION_MINUTES * 60_000);
      tx.update(paymentAttempts).set({ status: 'pending_verification', externalProviderReference: input.providerReference,
        providerPayloadReference: input.payloadReference, expiresAt: holdUntil, updatedAt: now }).where(eq(paymentAttempts.id, attempt.id)).run();
      tx.update(inventoryReservations).set({ expiresAt: holdUntil })
        .where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active'))).run();
      tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, order.id)).run();
    }
  }, { behavior: 'immediate' });
}

export function recordBaleDiagnostic(input: { attemptId?: string; updateId: string; eventType: string; safeCode: string; metadata?: Record<string, unknown> }) {
  const now = new Date();
  if (input.attemptId) {
    db.transaction(tx => {
      addPaymentEvent(tx, { paymentAttemptId: input.attemptId!, eventType: input.eventType, source: 'bale', externalEventId: `${input.updateId}:${input.eventType}`,
        metadata: { safeCode: input.safeCode, ...input.metadata }, createdAt: now });
      if (input.eventType === 'bale_verification_mismatch') {
        const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, input.attemptId!)).get();
        if (attempt && ['awaiting_customer', 'created'].includes(attempt.status)) {
          tx.update(paymentAttempts).set({ status: 'pending_verification', failureCode: input.safeCode, failureMessage: 'تأیید پرداخت بله نیازمند بررسی سامانه است.', updatedAt: now }).where(eq(paymentAttempts.id, attempt.id)).run();
          tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, attempt.orderId)).run();
        }
      }
    }, { behavior: 'immediate' });
  }
}

export function completeVerifiedBalePayment(input: {
  attemptId: string; updateId: string; transactionId: string; providerReference: string | null;
  payloadHash: string; receivedCurrency: string; receivedAmount: number; transactionStatus: string;
  transactionIdVerified: boolean; transactionAmount: number | null; transactionUserId: string | null;
}) {
  const now = new Date();
  return db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, input.attemptId)).get();
    if (!attempt || attempt.method !== 'bale_wallet') throw new ApiError(404, 'NOT_FOUND', 'پرداخت بله پیدا نشد.');
    if (attempt.status === 'verified') return { verified: true, idempotent: true };
    const session = tx.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get();
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    const payloadMatches = Boolean(session && session.invoicePayloadHash === input.payloadHash);
    const valid = payloadMatches && session?.baleUserId === input.transactionUserId
      && input.receivedCurrency === 'IRR' && input.receivedAmount === attempt.amountProviderUnits
      && input.transactionStatus === 'paid' && input.transactionIdVerified
      && input.transactionAmount === attempt.amountProviderUnits
      && attempt.externalTransactionId === input.transactionId
      && order?.totalTomans === attempt.amountTomans && order.orderStatus === 'awaiting_payment'
      && order.paymentStatus === 'pending' && ['awaiting_customer', 'pending_verification'].includes(attempt.status)
      && Boolean(attempt.expiresAt && attempt.expiresAt > now)
      && Boolean(order && activeReservations(order.id, now, tx).length);
    if (!valid) {
      const safeCode = !payloadMatches ? 'INVOICE_PAYLOAD_MISMATCH'
        : input.receivedCurrency !== 'IRR' ? 'CURRENCY_MISMATCH'
          : input.receivedAmount !== attempt.amountProviderUnits || input.transactionAmount !== attempt.amountProviderUnits ? 'AMOUNT_MISMATCH'
            : attempt.externalTransactionId !== input.transactionId ? 'TRANSACTION_ID_MISMATCH'
              : input.transactionUserId !== session?.baleUserId ? 'BALE_USER_MISMATCH'
                : input.transactionStatus !== 'paid' ? `TRANSACTION_${input.transactionStatus.toUpperCase()}` : 'PAYMENT_STATE_MISMATCH';
      if (['failed', 'rejected'].includes(input.transactionStatus) && payloadMatches
        && attempt.externalTransactionId === input.transactionId && order?.paymentStatus !== 'paid') {
        tx.update(paymentAttempts).set({ status: 'failed', externalTransactionId: input.transactionId,
          externalProviderReference: input.providerReference, failureCode: `TRANSACTION_${input.transactionStatus.toUpperCase()}`,
          failureMessage: 'تراکنش بله ناموفق بود.', failedAt: now, updatedAt: now }).where(eq(paymentAttempts.id, attempt.id)).run();
        if (order && order.orderStatus === 'awaiting_payment') tx.update(orders).set({ paymentStatus: 'unpaid', updatedAt: now }).where(eq(orders.id, order.id)).run();
        addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'payment_failed', source: 'bale', externalEventId: `${input.updateId}:payment_failed`,
          metadata: { safeCode: `TRANSACTION_${input.transactionStatus.toUpperCase()}`, transactionId: input.transactionId }, createdAt: now });
        return { verified: false, idempotent: false, safeCode: `TRANSACTION_${input.transactionStatus.toUpperCase()}` };
      }
      addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'bale_verification_mismatch', source: 'bale', externalEventId: `${input.updateId}:verification_mismatch`,
        metadata: { safeCode, receivedCurrency: input.receivedCurrency, receivedAmount: input.receivedAmount,
          transactionStatus: input.transactionStatus, transactionAmount: input.transactionAmount, transactionId: input.transactionId }, createdAt: now });
      tx.update(paymentAttempts).set({ status: 'pending_verification', externalProviderReference: input.providerReference, failureCode: safeCode,
        failureMessage: 'تطبیق پرداخت بله کامل نشد و نیازمند بررسی است.', updatedAt: now }).where(eq(paymentAttempts.id, attempt.id)).run();
      if (order && order.paymentStatus !== 'paid') tx.update(orders).set({ paymentStatus: 'pending', updatedAt: now }).where(eq(orders.id, order.id)).run();
      return { verified: false, idempotent: false, safeCode };
    }
    const reservations = tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.orderId, order!.id), eq(inventoryReservations.status, 'active'))).all();
    if (!reservations.length || reservations.some(row => row.expiresAt <= now)) throw new ApiError(409, 'RESERVATION_EXPIRED', 'رزرو موجودی برای پرداخت بله منقضی شده است.');
    for (const reservation of reservations) {
      const before = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get();
      if (!before || before.reserved < reservation.quantity || before.onHand < reservation.quantity) throw new ApiError(409, 'INVENTORY_RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
      const changed = tx.update(inventory).set({ onHand: sql`${inventory.onHand} - ${reservation.quantity}`, reserved: sql`${inventory.reserved} - ${reservation.quantity}`, updatedAt: now })
        .where(and(eq(inventory.variantId, reservation.variantId), sql`${inventory.onHand} >= ${reservation.quantity} and ${inventory.reserved} >= ${reservation.quantity}`)).run();
      if (!changed.changes) throw new ApiError(409, 'INVENTORY_RESERVATION_INCONSISTENT', 'رزرو موجودی نیازمند بررسی است.');
      tx.update(inventoryReservations).set({ status: 'consumed', consumedAt: now }).where(and(eq(inventoryReservations.id, reservation.id), eq(inventoryReservations.status, 'active'))).run();
      const after = tx.select().from(inventory).where(eq(inventory.variantId, reservation.variantId)).get()!;
      tx.insert(stockMovements).values({ variantId: reservation.variantId, movementType: 'sale_committed', quantityDelta: -reservation.quantity,
        onHandBefore: before.onHand, onHandAfter: after.onHand, referenceType: 'order', referenceId: order!.id,
        reason: `Bale payment verified for ${order!.orderNumber}`, createdAt: now }).run();
    }
    tx.update(paymentAttempts).set({ status: 'verified', externalTransactionId: input.transactionId,
      externalProviderReference: input.providerReference, providerPayloadReference: input.payloadHash.slice(0, 16), paidAt: now,
      updatedAt: now, failureCode: null, failureMessage: null }).where(eq(paymentAttempts.id, attempt.id)).run();
    tx.update(orders).set({ paymentStatus: 'paid', orderStatus: 'confirmed', updatedAt: now }).where(eq(orders.id, order!.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'payment_verified', source: 'bale', externalEventId: `${input.updateId}:payment_verified`,
      metadata: { transactionId: input.transactionId, providerReference: input.providerReference, amountProviderUnits: input.transactionAmount,
        currency: input.receivedCurrency }, createdAt: now });
    tx.insert(orderEvents).values({ orderId: order!.id, eventType: 'payment_verified', actorType: 'system',
      previousValue: 'pending', newValue: 'paid', note: 'پرداخت کیف پول بله از طریق استعلام سرور تأیید شد.',
      metadata: { paymentAttemptId: attempt.id }, createdAt: now }).run();
    const openAttempts = tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.orderId, order!.id), inArray(paymentAttempts.status, [...activeAttemptStatuses]))).all();
    for (const other of openAttempts) {
      if (other.id === attempt.id) continue;
      tx.update(paymentAttempts).set({ status: 'expired', failedAt: now, updatedAt: now, failureCode: 'ORDER_PAID_BY_OTHER_ATTEMPT', failureMessage: 'سفارش با روش پرداخت دیگری تأیید شد.' }).where(eq(paymentAttempts.id, other.id)).run();
      addPaymentEvent(tx, { paymentAttemptId: other.id, eventType: 'attempt_superseded', source: 'system', metadata: { paidAttemptId: attempt.id }, createdAt: now });
    }
    return { verified: true, idempotent: false };
  }, { behavior: 'immediate' });
}

function adminAttemptDto(row: typeof paymentAttempts.$inferSelect) {
  const order = db.select().from(orders).where(eq(orders.id, row.orderId)).get();
  const customer = order?.userId ? db.select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone }).from(users).where(eq(users.id, order.userId)).get() : undefined;
  return {
    id: row.id, orderId: row.orderId, orderNumber: order?.orderNumber ?? '—',
    customer: customer ? { id: customer.id, name: customer.fullName, email: customer.email, phone: customer.phone } : { id: null, name: order?.customerName ?? '—', email: order?.customerEmail ?? null, phone: order?.customerPhone ?? null },
    method: row.method, status: row.status, amountTomans: row.amountTomans, amountProviderUnits: row.amountProviderUnits,
    externalTransactionId: row.externalTransactionId, externalProviderReference: row.externalProviderReference,
    providerPayloadReference: row.providerPayloadReference, failureCode: row.failureCode, failureMessage: row.failureMessage,
    orderPaymentStatus: order?.paymentStatus, createdAt: row.createdAt, updatedAt: row.updatedAt, expiresAt: row.expiresAt, paidAt: row.paidAt,
  };
}

export function listAdminPayments(input: unknown) {
  const filters = z.object({
    search: z.string().trim().max(120).optional(), method: z.enum(['card_to_card', 'bale_wallet']).optional(),
    status: z.enum(['created','awaiting_customer','pending_verification','verified','rejected','failed','expired']).optional(),
    review: z.enum(['pending','approved','rejected']).optional(), page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }).parse(input);
  const whereParts = ['1=1'];
  const params: Array<string | number> = [];
  if (filters.method) { whereParts.push('pa.method = ?'); params.push(filters.method); }
  if (filters.status) { whereParts.push('pa.status = ?'); params.push(filters.status); }
  if (filters.review) { whereParts.push('exists (select 1 from manual_payment_receipts mr where mr.payment_attempt_id=pa.id and mr.review_status=?)'); params.push(filters.review); }
  if (filters.search) {
    const term = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    whereParts.push("(o.order_number like ? escape '\\' or o.customer_name like ? escape '\\' or coalesce(u.email,'') like ? escape '\\' or coalesce(u.phone,'') like ? escape '\\' or coalesce(pa.external_transaction_id,'') like ? escape '\\')");
    params.push(term, term, term, term, term);
  }
  const where = whereParts.join(' and ');
  const count = sqlite.prepare(`select count(*) as total from payment_attempts pa join orders o on o.id=pa.order_id left join users u on u.id=o.user_id where ${where}`).get(...params) as { total: number };
  const rows = sqlite.prepare(`select pa.* from payment_attempts pa join orders o on o.id=pa.order_id left join users u on u.id=o.user_id where ${where} order by pa.created_at desc limit ? offset ?`)
    .all(...params, filters.pageSize, (filters.page - 1) * filters.pageSize) as Array<Record<string, unknown>>;
  const ids = rows.map(row => String(row.id));
  const attempts = ids.length ? db.select().from(paymentAttempts).where(inArray(paymentAttempts.id, ids)).orderBy(desc(paymentAttempts.createdAt)).all() : [];
  return { payments: attempts.map(adminAttemptDto), pagination: { page: filters.page, pageSize: filters.pageSize, total: count.total, totalPages: Math.ceil(count.total / filters.pageSize) } };
}

export function getAdminPayment(attemptId: string) {
  const attempt = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'پرداخت پیدا نشد.');
  const order = db.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'سفارش پیدا نشد.');
  const receipts = db.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.paymentAttemptId, attempt.id)).orderBy(desc(manualPaymentReceipts.uploadedAt)).all();
  const events = db.select().from(paymentEvents).where(eq(paymentEvents.paymentAttemptId, attempt.id)).orderBy(paymentEvents.createdAt).all();
  const session = attempt.method === 'bale_wallet' ? db.select().from(balePaymentSessions).where(eq(balePaymentSessions.paymentAttemptId, attempt.id)).get() : undefined;
  const address = order.shippingAddressSnapshot as Record<string, string>;
  return {
    payment: {
      ...adminAttemptDto(attempt), methodSnapshot: attempt.methodSnapshot,
      order: { id: order.id, orderNumber: order.orderNumber, totalTomans: order.totalTomans,
        orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus,
        recipientName: address.recipientName, recipientPhone: address.phone, shippingAddress: address,
        items: db.select().from(orders).where(eq(orders.id, order.id)).get() ? sqlite.prepare('select sku_snapshot as sku, product_name_snapshot as product_name, variant_snapshot as variant, unit_price_tomans as unit_price_tomans, quantity, line_total_tomans as line_total_tomans from order_items where order_id=?').all(order.id) : [],
      },
      bale: session ? { chatId: session.baleChatId, invoiceMessageId: session.invoiceMessageId, invoiceStatus: session.invoiceStatus,
        payloadReference: session.invoicePayloadHash?.slice(0, 16) ?? null } : null,
      receipts: receipts.map(receipt => ({ id: receipt.id, mimeType: receipt.mimeType, sizeBytes: receipt.sizeBytes, sha256: receipt.sha256,
        width: receipt.width, height: receipt.height, uploadedAt: receipt.uploadedAt, reviewStatus: receipt.reviewStatus,
        reviewedAt: receipt.reviewedAt, reviewedByStaffId: receipt.reviewedByStaffId, reviewNote: receipt.reviewNote,
        url: `/api/v1/admin/payments/${attempt.id}/receipts/${receipt.id}` })),
      timeline: events.map(event => ({ eventType: event.eventType, source: event.source, metadata: event.metadataSafeJson, createdAt: event.createdAt })),
    },
  };
}

export function getReceiptStorageKey(attemptId: string, receiptId: string) {
  const receipt = db.select({ storageKey: manualPaymentReceipts.storageKey, mimeType: manualPaymentReceipts.mimeType })
    .from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.id, receiptId), eq(manualPaymentReceipts.paymentAttemptId, attemptId))).get();
  if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'رسید پیدا نشد.');
  return receipt;
}

export function claimWebhookUpdate(updateId: string, updateType: string) {
  const now = new Date();
  return db.transaction(tx => {
    const existing = tx.select().from(baleWebhookUpdates).where(eq(baleWebhookUpdates.updateId, updateId)).get();
    if (existing?.processingStatus === 'processed') return 'processed' as const;
    if (existing?.processingStatus === 'processing' && now.getTime() - existing.createdAt.getTime() < 30_000) return 'in_progress' as const;
    if (existing) tx.update(baleWebhookUpdates).set({ processingStatus: 'processing', safeErrorCode: null, createdAt: now }).where(eq(baleWebhookUpdates.updateId, updateId)).run();
    else tx.insert(baleWebhookUpdates).values({ updateId, updateType, processingStatus: 'processing', createdAt: now }).run();
    return 'claimed' as const;
  }, { behavior: 'immediate' });
}

export function finishWebhookUpdate(updateId: string, errorCode?: string) {
  const now = new Date();
  db.update(baleWebhookUpdates).set({ processingStatus: errorCode ? 'failed' : 'processed', safeErrorCode: errorCode ?? null, processedAt: errorCode ? null : now })
    .where(eq(baleWebhookUpdates.updateId, updateId)).run();
}

export function findAttemptByPayloadHash(payloadHash: string) {
  const linked = getBaleSessionByPayloadHash(payloadHash);
  return linked?.attempt ? { attempt: linked.attempt, session: linked.session } : undefined;
}

export function markBalePreCheckoutDecision(updateId: string, payloadHash: string, metadata: { currency: string; amount: number; transactionId: string; approved: boolean; code: string }) {
  const now = new Date();
  return db.transaction(tx => {
    const linked = getBaleSessionByPayloadHash(payloadHash, tx);
    if (!linked?.attempt || linked.attempt.status !== 'awaiting_customer') return false;
    const approved = metadata.approved && (!linked.attempt.externalTransactionId || linked.attempt.externalTransactionId === metadata.transactionId);
    if (approved) tx.update(paymentAttempts).set({ externalTransactionId: metadata.transactionId, updatedAt: now })
      .where(and(eq(paymentAttempts.id, linked.attempt.id), inArray(paymentAttempts.status, ['awaiting_customer', 'pending_verification']))).run();
    addPaymentEvent(tx, { paymentAttemptId: linked.attempt.id, eventType: 'bale_precheckout_received', source: 'bale', externalEventId: `${updateId}:pre_checkout`,
      metadata: { currency: metadata.currency, totalAmount: metadata.amount, transactionId: metadata.transactionId, approved, updateId }, createdAt: now });
    if (!approved) addPaymentEvent(tx, { paymentAttemptId: linked.attempt.id, eventType: 'bale_precheckout_rejected', source: 'bale', externalEventId: `${updateId}:pre_checkout_rejected`, metadata: { safeCode: metadata.code, updateId }, createdAt: now });
    return approved;
  }, { behavior: 'immediate' });
}

export function expirePaymentAttempt(attemptId: string, reason: string, now = new Date()) {
  return db.transaction(tx => {
    const attempt = tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).get();
    if (!attempt || !activeAttemptStatuses.includes(attempt.status as typeof activeAttemptStatuses[number])) return false;
    tx.update(paymentAttempts).set({ status: 'expired', failedAt: now, updatedAt: now, failureCode: 'PAYMENT_WINDOW_EXPIRED', failureMessage: reason }).where(eq(paymentAttempts.id, attempt.id)).run();
    const pendingReceipts = tx.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.paymentAttemptId, attempt.id), eq(manualPaymentReceipts.reviewStatus, 'pending'))).all();
    for (const receipt of pendingReceipts) tx.update(manualPaymentReceipts).set({ reviewStatus: 'rejected', reviewedAt: now, reviewNote: reason }).where(eq(manualPaymentReceipts.id, receipt.id)).run();
    const other = tx.select({ id: paymentAttempts.id }).from(paymentAttempts).where(and(eq(paymentAttempts.orderId, attempt.orderId), inArray(paymentAttempts.status, [...activeAttemptStatuses]))).all();
    const order = tx.select().from(orders).where(eq(orders.id, attempt.orderId)).get();
    if (!other.length && order && order.paymentStatus !== 'paid') tx.update(orders).set({ paymentStatus: 'unpaid', updatedAt: now }).where(eq(orders.id, order.id)).run();
    addPaymentEvent(tx, { paymentAttemptId: attempt.id, eventType: 'attempt_expired', source: 'system', metadata: { reason }, createdAt: now });
    return true;
  }, { behavior: 'immediate' });
}
