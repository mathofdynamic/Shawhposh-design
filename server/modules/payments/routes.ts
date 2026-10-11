import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute, ApiError } from '../../lib/errors';
import { allowRoles, requireCustomer } from '../auth/service';
import { normalizeAndStoreReceipt, readStoredReceipt, removeStoredReceipt } from './receiptStorage';
import {
  approveCardPayment, assertReceiptUploadAllowed, createBaleAttempt, createBalePaymentLink, createCardToCardAttempt,
  getAdminPayment, getAdminPaymentSettings, getCustomerPaymentOptions, getCustomerPaymentStatus,
  getReceiptStorageKey, listAdminPayments, recordReceiptUpload, rejectCardPayment,
  listPublicPaymentMethods, updateBalePaymentSettings, updateCardPaymentSettings,
} from './service';
import { configureBaleWebhook, isValidBaleWebhookSecret, processBaleWebhookUpdate, reverifyBalePayment } from './bale';

const uuidSchema = z.string().uuid();
const idempotencyHeader = (value: string | undefined) => z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/).parse(value);
const paymentLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const uploadLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false });
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new ApiError(422, 'RECEIPT_TYPE_INVALID', 'فقط تصویر JPEG، PNG یا WebP پذیرفته می‌شود.'));
      return;
    }
    callback(null, true);
  },
});

export const customerPaymentRoutes = Router();
customerPaymentRoutes.get('/:orderId/payment-options', asyncRoute((req, res) => {
  res.json(getCustomerPaymentOptions(req.principal!.id, uuidSchema.parse(req.params.orderId)));
}));

export const publicPaymentMethodRoutes = Router();
publicPaymentMethodRoutes.get('/methods', asyncRoute((_req, res) => res.json(listPublicPaymentMethods())));
customerPaymentRoutes.post('/:orderId/payments/card-to-card', paymentLimiter, asyncRoute((req, res) => {
  res.status(201).json(createCardToCardAttempt(req.principal!.id, uuidSchema.parse(req.params.orderId), idempotencyHeader(req.get('Idempotency-Key'))));
}));
customerPaymentRoutes.post('/:orderId/payments/bale', paymentLimiter, asyncRoute((req, res) => {
  res.status(201).json(createBaleAttempt(req.principal!.id, uuidSchema.parse(req.params.orderId), idempotencyHeader(req.get('Idempotency-Key'))));
}));

export const customerPaymentStatusRoutes = Router();
customerPaymentStatusRoutes.use(requireCustomer);
customerPaymentStatusRoutes.get('/:attemptId/status', asyncRoute((req, res) => {
  res.json(getCustomerPaymentStatus(req.principal!.id, uuidSchema.parse(req.params.attemptId)));
}));
customerPaymentStatusRoutes.post('/:attemptId/bale/link', paymentLimiter, asyncRoute((req, res) => {
  res.json(createBalePaymentLink(req.principal!.id, uuidSchema.parse(req.params.attemptId)));
}));
customerPaymentStatusRoutes.post('/:attemptId/receipt', requireCustomer, uploadLimiter, asyncRoute((req, _res, next) => {
  assertReceiptUploadAllowed(req.principal!.id, uuidSchema.parse(req.params.attemptId));
  next();
}), memoryUpload.single('receipt'), asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(422, 'RECEIPT_REQUIRED', 'تصویر رسید را انتخاب کنید.');
  const attemptId = uuidSchema.parse(req.params.attemptId);
  const normalized = await normalizeAndStoreReceipt(req.file.buffer, req.file.mimetype);
  try {
    const result = recordReceiptUpload(req.principal!.id, attemptId, normalized);
    res.status(201).json(result);
  } catch (error) {
    removeStoredReceipt(normalized.storageKey);
    throw error;
  }
}));

export const baleWebhookRoutes = Router();
baleWebhookRoutes.post('/bale/webhook/:secret', asyncRoute(async (req, res) => {
  if (!isValidBaleWebhookSecret(req.params.secret)) throw new ApiError(404, 'NOT_FOUND', 'مسیر پیدا نشد.');
  await processBaleWebhookUpdate(req.body);
  res.json({ ok: true });
}));

const paymentReaders = allowRoles('owner', 'store_manager', 'finance');
const paymentReviewers = allowRoles('owner', 'store_manager', 'finance');
const paymentSettingsManagers = allowRoles('owner', 'store_manager');

export const adminPaymentRoutes = Router();
adminPaymentRoutes.get('/settings', paymentSettingsManagers, asyncRoute((_req, res) => res.json(getAdminPaymentSettings())));
adminPaymentRoutes.patch('/settings/card-to-card', paymentSettingsManagers, asyncRoute((req, res) => res.json(updateCardPaymentSettings(req.body))));
adminPaymentRoutes.patch('/settings/bale-wallet', paymentSettingsManagers, asyncRoute(async (req, res) => {
  const input = z.object({ enabled: z.boolean() }).strict().parse(req.body);
  if (input.enabled) await configureBaleWebhook();
  res.json(updateBalePaymentSettings(input, input.enabled));
}));
adminPaymentRoutes.get('/', paymentReaders, asyncRoute((req, res) => res.json(listAdminPayments(req.query))));
adminPaymentRoutes.get('/:attemptId/receipts/:receiptId', paymentReaders, asyncRoute((req, res) => {
  const attemptId = uuidSchema.parse(req.params.attemptId);
  const receiptId = uuidSchema.parse(req.params.receiptId);
  const receipt = getReceiptStorageKey(attemptId, receiptId);
  const contents = readStoredReceipt(receipt.storageKey);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Content-Disposition', 'inline; filename="payment-receipt.webp"');
  res.type('image/webp').send(contents);
}));
adminPaymentRoutes.get('/:attemptId', paymentReaders, asyncRoute((req, res) => res.json(getAdminPayment(uuidSchema.parse(req.params.attemptId)))));
adminPaymentRoutes.post('/:attemptId/manual-approve', paymentReviewers, asyncRoute((req, res) => {
  res.json(approveCardPayment(uuidSchema.parse(req.params.attemptId), req.principal!.id, req.body));
}));
adminPaymentRoutes.post('/:attemptId/manual-reject', paymentReviewers, asyncRoute((req, res) => {
  res.json(rejectCardPayment(uuidSchema.parse(req.params.attemptId), req.principal!.id, req.body));
}));
adminPaymentRoutes.post('/:attemptId/bale/reverify', paymentReviewers, asyncRoute(async (req, res) => {
  res.json(await reverifyBalePayment(uuidSchema.parse(req.params.attemptId)));
}));
