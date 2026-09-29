/**
 * Shahpoosh Luxury Streetwear - Refund Request Modal
 * Strictly enforces that refunds cannot exceed captured amount.
 * Enforces verified paid eligibility and records auditable refund requests.
 */

import React, { useState, useMemo } from 'react';
import { RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';
import { Modal, Button, FormField, Input, useToast } from '../ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { PaymentAttempt } from '../../domain/types';
import { toFaDigits, formatPriceTomans } from '../../utils/formatters';
import { validateRefundEligibility } from '../../domain/paymentLedger';

export interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentAttempt | null;
  onRefundSubmitted?: () => void;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  isOpen,
  onClose,
  payment,
  onRefundSubmitted,
}) => {
  const { state, requestRefund, getRefunds } = useAdminRepository();
  const { addToast } = useToast();

  const [requestedAmount, setRequestedAmount] = useState<string>('');
  const [reason, setReason] = useState('انصراف مشتری پیش از برش و چاپ در کارگاه');
  const [destinationIban, setDestinationIban] = useState('IR72 0560 0843 8000 1234 5678 01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Existing refunds for this payment
  const existingRefunds = useMemo(() => {
    if (!payment) return [];
    return getRefunds().filter((r) => r.paymentId === payment.id);
  }, [payment, getRefunds]);

  // Validation & Max Cap
  const eligibility = useMemo(() => {
    if (!payment) return { eligible: false, maxAllowedAmount: 0, error: 'تراکنش یافت نشد.' };
    return validateRefundEligibility(
      payment,
      parseInt(requestedAmount, 10) || payment.amountTomans,
      existingRefunds
    );
  }, [payment, requestedAmount, existingRefunds]);

  // Default amount to max allowed when opened
  React.useEffect(() => {
    if (payment && isOpen) {
      const prior = existingRefunds
        .filter((r) => r.status === 'approved' || r.status === 'processed')
        .reduce((sum, r) => sum + (r.processedAmountTomans || r.requestedAmountTomans), 0);
      const remaining = Math.max(0, payment.amountTomans - prior);
      setRequestedAmount(remaining.toString());
    }
  }, [payment, isOpen, existingRefunds]);

  if (!payment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(requestedAmount, 10);

    if (isNaN(amountNum) || amountNum <= 0) {
      addToast({
        title: 'مبلغ نامعتبر',
        description: 'لطفاً مبلغ معتبری برای استرداد وارد کنید.',
        type: 'error',
      });
      return;
    }

    if (amountNum > eligibility.maxAllowedAmount) {
      addToast({
        title: 'فراتر از سقف مجاز',
        description: `حداکثر سقف قابل استرداد این تراکنش ${formatPriceTomans(eligibility.maxAllowedAmount)} است.`,
        type: 'error',
      });
      return;
    }

    if (!reason.trim()) {
      addToast({
        title: 'علت الزامی است',
        description: 'ثبت علت رسمی استرداد برای حسابرسی مالیاتی الزامی است.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    const res = requestRefund({
      paymentId: payment.id,
      amountTomans: amountNum,
      reason: reason.trim(),
      destinationIban: destinationIban.trim(),
      staffId: state.staff[0]?.id || 'STF-01',
    });

    setIsSubmitting(false);

    if (res.success) {
      addToast({
        title: 'درخواست استرداد ثبت شد',
        description: `درخواست پرونده ${res.data?.id} جهت بررسی مدیر مالی ایجاد گردید.`,
        type: 'success',
      });
      onClose();
      if (onRefundSubmitted) onRefundSubmitted();
    } else {
      addToast({
        title: 'خطای استرداد',
        description: res.error || 'امکان ثبت درخواست وجود ندارد.',
        type: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت درخواست استرداد وجه تراکنش (Refund Request)"
      description="بر اساس قوانین مالیاتی و انضباط حسابداری، مبلغ استرداد تحت هیچ شرایطی نمی‌تواند از سقف تسویه اولیه تراکنش فراتر رود."
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !eligibility.eligible}
            icon={RotateCcw}
          >
            {isSubmitting ? 'در حال ثبت...' : 'ارسال درخواست جهت تایید مالی'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right font-sans">
        {/* Invariant Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>قانون انضباط مالی:</strong> مبالغ استرداد به صورت تفکیک‌شده ذخیره می‌شوند و تا زمان اجرای تسویه نهایی، به عنوان تعهد مالی بستانکار در دفاتر نگهداری می‌گردند.
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3.5 bg-stone-900 rounded-xl border border-white/10 space-y-1.5 text-xs font-fanum">
          <div className="flex justify-between text-stone-400">
            <span>شناسه تراکنش:</span>
            <span className="font-mono text-white font-bold">{payment.id}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>سفارش متصل:</span>
            <span className="font-mono text-[#eed29d]">{payment.orderId}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>مبلغ اولیه تراکنش:</span>
            <span className="text-white font-bold">{formatPriceTomans(payment.amountTomans)}</span>
          </div>
          <div className="flex justify-between text-stone-400 pt-1 border-t border-white/5">
            <span>حداکثر سقف مجاز برای استرداد:</span>
            <span className="text-emerald-400 font-bold">
              {formatPriceTomans(eligibility.maxAllowedAmount)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <FormField label="مبلغ استرداد درخواستی (تومان)" required>
          <div className="relative">
            <Input
              type="number"
              min="1000"
              max={eligibility.maxAllowedAmount}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder="مثلاً: ۵۹۰,۰۰۰"
              className="font-fanum text-left pr-3 pl-16 font-bold text-[#eed29d]"
            />
            <span className="absolute left-3 top-2.5 text-xs text-stone-400">تومان</span>
          </div>
          <div className="flex justify-between items-center mt-1 text-[11px] text-stone-400">
            <span>
              نوع استرداد:{' '}
              <strong className="text-white">
                {parseInt(requestedAmount, 10) === payment.amountTomans ? 'استرداد کامل (Full)' : 'استرداد جزئی (Partial)'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setRequestedAmount(eligibility.maxAllowedAmount.toString())}
              className="text-[#eed29d] hover:underline"
            >
              انتخاب سقف کامل ({formatPriceTomans(eligibility.maxAllowedAmount)})
            </button>
          </div>
        </FormField>

        {/* Destination IBAN */}
        <FormField label="شماره شبا یا حساب مقصد عودت وجه" required>
          <Input
            value={destinationIban}
            onChange={(e) => setDestinationIban(e.target.value)}
            placeholder="IR..."
            dir="ltr"
            className="font-mono text-xs"
          />
        </FormField>

        {/* Reason */}
        <FormField label="علت رسمی استرداد (درج در دفاتر مالی و گزارش حسابرسی)" required>
          <textarea
            className="w-full bg-[#181614] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ba8d3d] min-h-[70px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: مغایرت در سایز درخواستی مشتری پیش از خروج از انبار..."
          />
        </FormField>
      </form>
    </Modal>
  );
};
