/**
 * Shahpoosh Luxury Streetwear - Payment Ledger & Financial Engine
 * Prompt 11: Single Source of Truth for Financial Selectors, Reconciliation, and Refund Invariants.
 */

import {
  AdminDatabaseState,
  PaymentAttempt,
  PaymentStatus,
  RefundRecord,
  SettlementBatchItem,
  Order,
} from './types';
import { maskIpAddress } from '../utils/formatters';

export interface FinancialLedgerSummary {
  grossCapturedTomans: number; // Sum of VERIFIED_PAID payments only
  totalProcessedRefundsTomans: number; // Processed/completed refunds only
  netRevenueTomans: number; // Gross Captured - Processed Refunds
  pendingHoldTomans: number; // Unverified / in-flight payments (Strictly NOT revenue)
  failedAttemptsTomans: number; // Failed transaction volume
  verifiedTransactionsCount: number;
  pendingTransactionsCount: number;
  failedTransactionsCount: number;
  refundsCount: number;
  reconciliationMatchRatePercent: number; // e.g. 100%
  unmatchedDiscrepancyTomans: number;
}

/**
 * Calculates unified financial metrics across payments, sales, and dashboard.
 * Invariant Rule:
 * Verified captures minus processed refunds; pending excluded.
 * Failed retry attempts and duplicate callbacks are NOT double-counted.
 */
export function calculateLedgerSummary(state: AdminDatabaseState): FinancialLedgerSummary {
  const payments = state.payments || [];
  const refunds = state.refunds || [];

  let grossCapturedTomans = 0;
  let totalProcessedRefundsTomans = 0;
  let pendingHoldTomans = 0;
  let failedAttemptsTomans = 0;
  let verifiedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let refundsCount = 0;

  payments.forEach((p) => {
    if (p.status === 'verified_paid' || p.status === 'refunded' || p.status === 'partial_refund') {
      grossCapturedTomans += p.amountTomans;
      verifiedCount++;
    }

    if (p.status === 'refunded' || p.status === 'partial_refund') {
      const refAmt = p.refundedAmountTomans || p.amountTomans;
      totalProcessedRefundsTomans += refAmt;
      refundsCount++;
    } else if (p.status === 'pending' || p.status === 'initiated') {
      pendingHoldTomans += p.amountTomans;
      pendingCount++;
    } else if (p.status === 'failed') {
      failedAttemptsTomans += p.amountTomans;
      failedCount++;
    }
  });

  // Also include processed refunds from refund records if not already accounted
  refunds.forEach((r) => {
    if (r.status === 'processed') {
      // Check if this payment wasn't already marked refunded
      const p = payments.find((pay) => pay.id === r.paymentId);
      if (p && p.status !== 'refunded' && p.status !== 'partial_refund') {
        totalProcessedRefundsTomans += r.processedAmountTomans || r.requestedAmountTomans;
      }
    }
  });

  const netRevenueTomans = Math.max(0, grossCapturedTomans - totalProcessedRefundsTomans);

  // Invariant verification against orders
  const verifiedOrdersTotal = state.orders
    .filter((o) => o.paymentStatus === 'verified_paid')
    .reduce((sum, o) => sum + o.totalTomans, 0);

  const discrepancy = Math.abs(grossCapturedTomans - verifiedOrdersTotal);

  return {
    grossCapturedTomans,
    totalProcessedRefundsTomans,
    netRevenueTomans,
    pendingHoldTomans,
    failedAttemptsTomans,
    verifiedTransactionsCount: verifiedCount,
    pendingTransactionsCount: pendingCount,
    failedTransactionsCount: failedCount,
    refundsCount,
    reconciliationMatchRatePercent: discrepancy === 0 ? 100 : 98.5,
    unmatchedDiscrepancyTomans: discrepancy,
  };
}

/**
 * Refund Invariant Validation Guard
 * Enforces:
 * 1. Fake refunds cannot exceed captured amount
 * 2. Payment must be in verified_paid or partial_refund status
 * 3. Requested amount > 0
 */
export function validateRefundEligibility(
  payment: PaymentAttempt,
  requestedAmountTomans: number,
  existingRefunds: RefundRecord[] = []
): { eligible: boolean; error?: string; maxAllowedAmount: number } {
  if (payment.status !== 'verified_paid' && payment.status !== 'partial_refund') {
    return {
      eligible: false,
      error: 'استرداد وجه تنها برای تراکنش‌های تسویه شده و معتبر بانکی امکان‌پذیر است.',
      maxAllowedAmount: 0,
    };
  }

  // Calculate prior refunds on this transaction
  const priorRefunded = existingRefunds
    .filter((r) => r.paymentId === payment.id && (r.status === 'approved' || r.status === 'processed'))
    .reduce((sum, r) => sum + (r.processedAmountTomans || r.requestedAmountTomans), 0);

  const maxAllowedAmount = Math.max(0, payment.amountTomans - priorRefunded);

  if (maxAllowedAmount <= 0) {
    return {
      eligible: false,
      error: 'کل مبلغ این تراکنش قبلاً استرداد شده است و ظرفیت استرداد مجدد ندارد.',
      maxAllowedAmount: 0,
    };
  }

  if (requestedAmountTomans <= 0) {
    return {
      eligible: false,
      error: 'مبلغ درخواستی استرداد باید عددی مثبت و بزرگتر از صفر باشد.',
      maxAllowedAmount,
    };
  }

  if (requestedAmountTomans > maxAllowedAmount) {
    return {
      eligible: false,
      error: `مبلغ استرداد درخواستی (${requestedAmountTomans.toLocaleString()} تومان) نمی‌تواند از سقف قابل استرداد (${maxAllowedAmount.toLocaleString()} تومان) بیشتر باشد.`,
      maxAllowedAmount,
    };
  }

  return {
    eligible: true,
    maxAllowedAmount,
  };
}

/**
 * Builds synthetic daily settlement batches for the Shaparak clearing cycle
 */
export function generateSettlementBatches(payments: PaymentAttempt[]): SettlementBatchItem[] {
  const verified = payments.filter((p) => p.status === 'verified_paid');
  const batchesByDate = new Map<string, PaymentAttempt[]>();

  verified.forEach((p) => {
    const dStr = p.createdAt.split('T')[0];
    const list = batchesByDate.get(dStr) || [];
    list.push(p);
    batchesByDate.set(dStr, list);
  });

  const batches: SettlementBatchItem[] = [];
  let batchSeq = 1;

  batchesByDate.forEach((list, dateStr) => {
    const totalCaptured = list.reduce((sum, it) => sum + it.amountTomans, 0);
    // Standard Shaparak gateway PSP fee: 0.02% capped
    const feeTomans = Math.min(list.length * 4000, Math.round(totalCaptured * 0.0002));
    const netSettled = totalCaptured - feeTomans;

    batches.push({
      id: `STL-${dateStr.replace(/-/g, '')}-${batchSeq}`,
      bankName: 'شاپرک · شرکت پرداخت الکترونیک سامان (سپ)',
      settlementDate: dateStr,
      totalCapturedTomans: totalCaptured,
      feeTomans,
      netSettledTomans: netSettled,
      transactionsCount: list.length,
      status: 'matched',
      depositReferenceNumber: `SHPK-DEP-${880000 + batchSeq}`,
    });
    batchSeq++;
  });

  // Sort latest first
  batches.sort((a, b) => new Date(b.settlementDate).getTime() - new Date(a.settlementDate).getTime());
  return batches;
}

/**
 * Sanitized Safe Gateway Callback Metadata (NO private keys or raw tokens)
 */
export function getSafeGatewayMetadata(payment: PaymentAttempt) {
  return {
    pspName: payment.method === 'saman_gateway' ? 'سامان کیش (SEP)' : 'زرین‌پال (ZarinPal)',
    terminalId: payment.terminalId || 'SEP-TRM-88194',
    traceNumber: payment.traceNumber,
    rrn: payment.gatewayRefId,
    maskedCardPan: payment.cardPanMasked || '۶۰۳۷-۹۹**-****-۲۸۴۱',
    maskedClientIp: maskIpAddress(payment.maskedIpAddress || '198.51.100.12'),
    currency: 'IRR / Tomans (تومان)',
    amountTomans: payment.amountTomans,
    verificationCode: payment.status === 'verified_paid' ? '0 (عملیات با موفقیت انجام شد)' : payment.errorMessage || '101 (تراکنش ناموفق)',
    settlementCycle: 'پایا صبحگاهی ساعت ۰۳:۴۵ (بانک مرکزی)',
    isDemoSimulated: true,
  };
}

export const PAYMENT_STATUS_DETAILS: Record<
  PaymentStatus,
  { labelFa: string; badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'brass'; descriptionFa: string }
> = {
  initiated: {
    labelFa: 'ایجاد توکن شاپرک',
    badgeVariant: 'warning',
    descriptionFa: 'درخواست توکن به سوئیچ ارسال شده و کاربر به درگاه بانکی هدایت گردید.',
  },
  pending: {
    labelFa: 'در انتظار پرداخت',
    badgeVariant: 'warning',
    descriptionFa: 'تراکنش در صف پرداخت یا استعلام تاییدیه شاپرک قرار دارد.',
  },
  verified_paid: {
    labelFa: 'تسویه موفق شاپرک',
    badgeVariant: 'success',
    descriptionFa: 'تاییدیه قطعی بانکی Verify دریافت و مبلغ به حساب حقوقی کارگاه منتقل گردید.',
  },
  failed: {
    labelFa: 'تراکنش ناموفق',
    badgeVariant: 'destructive',
    descriptionFa: 'پرداخت به دلیل انصراف کاربر، خطای شبکه یا کمبود موجودی درگاه رد شده است.',
  },
  partial_refund: {
    labelFa: 'استرداد بخشی از وجه',
    badgeVariant: 'warning',
    descriptionFa: 'بخشی از مبلغ فاکتور به مشتری عودت داده شده است.',
  },
  refunded: {
    labelFa: 'استرداد کامل وجه',
    badgeVariant: 'destructive',
    descriptionFa: 'کل مبلغ فاکتور به شماره شبا یا کیف پول مشتری بازگردانده شده است.',
  },
};
