import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config, isBalePaymentConfigured } from '../../config';
import { ApiError } from '../../lib/errors';
import {
  claimBaleStartToken, claimWebhookUpdate, completeVerifiedBalePayment, finishWebhookUpdate,
  findAttemptByPayloadHash, getBaleReverificationContext, getBaleSessionByPayloadHash, markBaleInvoiceError, markBaleInvoiceSent,
  markBalePreCheckoutDecision, recordBaleDiagnostic, recordBalePaymentReceived, validateBalePreCheckout,
} from './service';

export interface BaleClient {
  sendInvoice(input: { chatId: string; title: string; description: string; payload: string; providerToken: string; amountRials: number }): Promise<{ messageId: string }>;
  sendMessage(chatId: string, text: string): Promise<void>;
  answerPreCheckoutQuery(input: { id: string; ok: boolean; errorMessage?: string }): Promise<void>;
  inquireTransaction(transactionId: string): Promise<{ id: string; status: string; userId: string; amount: number }>;
  setWebhook(url: string): Promise<void>;
  getWebhookInfo(): Promise<{ url: string }>;
}

export class BaleApiError extends Error {
  constructor(public readonly safeCode: string, public readonly definitive: boolean) {
    super('Bale API request failed');
    this.name = 'BaleApiError';
  }
}

export function createBaleClient(options: {
  token: string;
  providerToken: string;
  apiBase?: string;
  fetchImpl?: typeof fetch;
}): BaleClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.apiBase ?? 'https://tapi.bale.ai').replace(/\/+$/, '');
  const call = async (method: string, body: Record<string, unknown>, timeoutMs = 7_000) => {
    let response: Response;
    try {
      response = await fetchImpl(`${base}/bot${options.token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BaleApiError('BALE_NETWORK_UNAVAILABLE', false);
    }
    let result: { ok?: boolean; result?: unknown; description?: unknown };
    try { result = await response.json() as typeof result; }
    catch { throw new BaleApiError('BALE_RESPONSE_INVALID', false); }
    if (!response.ok || result.ok !== true) throw new BaleApiError('BALE_METHOD_REJECTED', true);
    return result.result;
  };
  return {
    async sendInvoice(input) {
      const result = await call('sendInvoice', {
        chat_id: input.chatId, title: input.title, description: input.description,
        payload: input.payload, provider_token: options.providerToken,
        prices: [{ label: input.title, amount: input.amountRials }],
      }) as { message_id?: string | number } | undefined;
      if (!result?.message_id) throw new BaleApiError('BALE_INVOICE_RESPONSE_INVALID', false);
      return { messageId: String(result.message_id) };
    },
    async sendMessage(chatId, text) { await call('sendMessage', { chat_id: chatId, text }); },
    async answerPreCheckoutQuery(input) {
      await call('answerPreCheckoutQuery', {
        pre_checkout_query_id: input.id,
        ok: input.ok,
        ...(input.ok ? {} : { error_message: input.errorMessage ?? 'امکان تأیید این پرداخت وجود ندارد.' }),
      }, 5_000);
    },
    async inquireTransaction(transactionId) {
      const result = await call('inquireTransaction', { transaction_id: transactionId }) as {
        id?: string | number; status?: string; userID?: string | number; amount?: number;
      } | undefined;
      if (!result || result.id == null || !result.status || result.userID == null || !Number.isSafeInteger(result.amount)) {
        throw new BaleApiError('BALE_INQUIRY_RESPONSE_INVALID', false);
      }
      return { id: String(result.id), status: result.status, userId: String(result.userID), amount: result.amount! };
    },
    async setWebhook(url) { await call('setWebhook', { url }); },
    async getWebhookInfo() {
      const result = await call('getWebhookInfo', {}) as { url?: unknown } | undefined;
      if (!result || typeof result.url !== 'string') throw new BaleApiError('BALE_WEBHOOK_INFO_INVALID', false);
      return { url: result.url };
    },
  };
}

export const baleClient = createBaleClient({
  token: config.BALE_BOT_TOKEN,
  providerToken: config.BALE_PAYMENT_PROVIDER_TOKEN,
  apiBase: config.BALE_API_BASE,
});

export function isValidBaleWebhookSecret(candidate: string) {
  const expected = config.BALE_WEBHOOK_SECRET;
  if (!expected || expected.length < 32 || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

const baleId = z.union([z.string().min(1).max(80), z.number().int().safe().positive()]);
const updateSchema = z.object({
  update_id: z.number().int().safe().nonnegative(),
  message: z.object({
    message_id: z.union([z.number().int().safe(), z.string().max(80)]).optional(),
    text: z.string().max(4096).optional(),
    chat: z.object({ id: baleId, type: z.string().max(20) }),
    from: z.object({ id: baleId, is_bot: z.boolean().optional() }).optional(),
  }).passthrough().optional(),
  pre_checkout_query: z.object({
    id: z.string().min(1).max(200), from: z.object({ id: baleId }),
    currency: z.string().max(8), total_amount: z.number().int().safe().nonnegative(), invoice_payload: z.string().min(1).max(128),
  }).passthrough().optional(),
}).passthrough().extend({
  message: z.object({
    message_id: z.union([z.number().int().safe(), z.string().max(80)]).optional(),
    text: z.string().max(4096).optional(),
    chat: z.object({ id: baleId, type: z.string().max(20) }),
    from: z.object({ id: baleId, is_bot: z.boolean().optional() }).optional(),
    successful_payment: z.object({
      currency: z.string().max(8), total_amount: z.number().int().safe().nonnegative(), invoice_payload: z.string().min(1).max(128),
      telegram_payment_charge_id: z.string().min(1).max(200), provider_payment_charge_id: z.string().max(200).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
});

function updateType(update: z.infer<typeof updateSchema>) {
  if (update.pre_checkout_query) return 'pre_checkout_query';
  if (update.message?.successful_payment) return 'successful_payment';
  if (update.message?.text) return 'message';
  return 'other';
}

async function handleStartMessage(updateId: string, message: NonNullable<z.infer<typeof updateSchema>['message']>, client: BaleClient) {
  const sender = message.from;
  const text = message.text ?? '';
  const match = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{43})\s*$/.exec(text);
  if (message.chat.type !== 'private' || !sender || sender.is_bot || !match || String(sender.id) !== String(message.chat.id)) {
    if (message.chat.type === 'private' && sender && String(sender.id) === String(message.chat.id)) {
      await client.sendMessage(String(message.chat.id), 'برای ادامه پرداخت، از پیوند پرداختی که در سایت ساخته‌اید وارد شوید.');
    }
    return;
  }
  const claimed = claimBaleStartToken(match[1], String(sender.id), String(message.chat.id));
  if (!claimed) {
    await client.sendMessage(String(message.chat.id), 'پیوند پرداخت معتبر نیست یا مهلت آن به پایان رسیده است. از سایت پیوند تازه دریافت کنید.');
    return;
  }
  if (claimed.kind === 'already_active') {
    await client.sendMessage(String(message.chat.id), 'صورتحساب در حال ارسال است یا قبلاً در همین گفت‌وگو ثبت شده است.');
    return;
  }
  try {
    const sent = await client.sendInvoice({
      chatId: String(message.chat.id),
      title: 'Shawhposh order',
      description: `Payment for ${claimed.order.orderNumber}`.slice(0, 255),
      payload: claimed.invoicePayload,
      providerToken: config.BALE_PAYMENT_PROVIDER_TOKEN,
      amountRials: claimed.attempt.amountProviderUnits!,
    });
    markBaleInvoiceSent(claimed.attempt.id, sent.messageId);
  } catch (error) {
    const definitive = error instanceof BaleApiError && error.definitive;
    markBaleInvoiceError(claimed.attempt.id, definitive, claimed.retry);
    if (definitive && !claimed.retry) {
      await client.sendMessage(String(message.chat.id), 'ساخت صورتحساب پرداخت انجام نشد. به سایت برگردید و روش پرداخت دیگری انتخاب کنید.');
      return;
    }
    if (claimed.retry && definitive) {
      await client.sendMessage(String(message.chat.id), 'ارسال دوباره تأیید نشد. اگر صورتحساب قبلی را نمی‌بینید، از سایت پیوند تازه بگیرید و دوباره تلاش کنید.');
      return;
    }
    throw error;
  }
  void updateId;
}

async function handlePreCheckout(updateId: string, query: NonNullable<z.infer<typeof updateSchema>['pre_checkout_query']>, client: BaleClient) {
  const decision = validateBalePreCheckout({
    invoicePayload: query.invoice_payload, currency: query.currency, totalAmount: query.total_amount,
    baleUserId: String(query.from.id), transactionId: query.id,
  });
  const accepted = markBalePreCheckoutDecision(updateId, createHash('sha256').update(query.invoice_payload).digest('hex'), {
    currency: query.currency, amount: query.total_amount, transactionId: query.id,
    approved: decision.ok, code: decision.ok ? 'OK' : decision.code,
  });
  await client.answerPreCheckoutQuery({
    id: query.id, ok: decision.ok && accepted,
    ...(decision.ok && accepted ? {} : { errorMessage: 'اطلاعات پرداخت یا مهلت رزرو سفارش معتبر نیست. از سایت پیوند تازه دریافت کنید.' }),
  });
}

async function handleSuccessfulPayment(updateId: string, message: NonNullable<z.infer<typeof updateSchema>['message']>, client: BaleClient) {
  const payment = message.successful_payment;
  if (!payment) return;
  const payloadHash = createHash('sha256').update(payment.invoice_payload).digest('hex');
  const linked = getBaleSessionByPayloadHash(payloadHash);
  if (!linked?.attempt) return;
  const attempt = linked.attempt;
  const userMatches = linked.session.baleUserId === String(message.from?.id ?? '');
  recordBalePaymentReceived(attempt.id, updateId, { currency: payment.currency, totalAmount: payment.total_amount,
    transactionId: payment.telegram_payment_charge_id, providerReference: payment.provider_payment_charge_id ?? null,
    payloadReference: payloadHash.slice(0, 16), baleUserId: String(message.from?.id ?? '') || null });
  let transaction: Awaited<ReturnType<BaleClient['inquireTransaction']>>;
  try {
    transaction = await client.inquireTransaction(payment.telegram_payment_charge_id);
  } catch (error) {
    recordBaleDiagnostic({ attemptId: attempt.id, updateId, eventType: 'bale_inquiry_failed',
      safeCode: error instanceof BaleApiError ? error.safeCode : 'BALE_INQUIRY_FAILED' });
    throw error;
  }
  const transactionIdVerified = transaction.id === payment.telegram_payment_charge_id && userMatches;
  completeVerifiedBalePayment({
    attemptId: attempt.id, updateId, transactionId: payment.telegram_payment_charge_id,
    providerReference: payment.provider_payment_charge_id ?? null, payloadHash,
    receivedCurrency: payment.currency, receivedAmount: payment.total_amount,
    transactionStatus: transaction.status, transactionIdVerified,
    transactionAmount: transaction.amount, transactionUserId: transaction.userId,
  });
}

export async function processBaleWebhookUpdate(raw: unknown, client: BaleClient = baleClient) {
  if (!isBalePaymentConfigured()) throw new ApiError(503, 'BALE_NOT_CONFIGURED', 'Webhook بله پیکربندی نشده است.');
  const update = updateSchema.parse(raw);
  const updateId = String(update.update_id);
  const type = updateType(update);
  const claim = claimWebhookUpdate(updateId, type);
  if (claim === 'processed') return { accepted: true, duplicate: true };
  if (claim === 'in_progress') throw new ApiError(503, 'BALE_UPDATE_IN_PROGRESS', 'درخواست بله در حال پردازش است؛ دوباره ارسال کنید.');
  try {
    if (update.message?.successful_payment) await handleSuccessfulPayment(updateId, update.message, client);
    else if (update.pre_checkout_query) await handlePreCheckout(updateId, update.pre_checkout_query, client);
    else if (update.message?.text) await handleStartMessage(updateId, update.message, client);
    finishWebhookUpdate(updateId);
    return { accepted: true, duplicate: false };
  } catch (error) {
    finishWebhookUpdate(updateId, error instanceof BaleApiError ? error.safeCode : 'BALE_UPDATE_PROCESSING_FAILED');
    throw error;
  }
}

export async function reverifyBalePayment(attemptId: string, client: BaleClient = baleClient) {
  if (!isBalePaymentConfigured()) throw new ApiError(503, 'BALE_NOT_CONFIGURED', 'Webhook بله پیکربندی نشده است.');
  const context = getBaleReverificationContext(attemptId);
  const transaction = await client.inquireTransaction(context.attempt.externalTransactionId!);
  return completeVerifiedBalePayment({
    attemptId, updateId: `admin-reverify-${randomUUID()}`, transactionId: context.received.transactionId,
    providerReference: context.received.providerReference, payloadHash: context.session.invoicePayloadHash,
    receivedCurrency: context.received.currency, receivedAmount: context.received.totalAmount,
    transactionStatus: transaction.status, transactionIdVerified: transaction.id === context.received.transactionId,
    transactionAmount: transaction.amount, transactionUserId: transaction.userId,
  });
}

export async function configureBaleWebhook(client: BaleClient = baleClient) {
  if (!isBalePaymentConfigured()) throw new ApiError(409, 'BALE_CREDENTIALS_MISSING', 'تنظیمات امن ربات بله روی سرور کامل نیست.');
  if (config.NODE_ENV === 'production' && new URL(config.APP_ORIGIN).protocol !== 'https:') {
    throw new ApiError(409, 'BALE_HTTPS_REQUIRED', 'وب‌هوک بله به نشانی امن HTTPS نیاز دارد.');
  }
  const url = `${config.APP_ORIGIN.replace(/\/$/, '')}/api/v1/payments/bale/webhook/${config.BALE_WEBHOOK_SECRET}`;
  try {
    await client.setWebhook(url);
    const current = await client.getWebhookInfo();
    if (current.url !== url) throw new ApiError(502, 'BALE_WEBHOOK_VERIFICATION_FAILED', 'ثبت وب‌هوک بله تأیید نشد.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'BALE_WEBHOOK_CONFIGURATION_FAILED', 'ثبت وب‌هوک بله انجام نشد. تنظیمات را بررسی و دوباره تلاش کنید.');
  }
  return { verified: true };
}
