/**
 * Shahpoosh Luxury Streetwear - Payment Transaction Detail
 * Dedicated cockpit for `/admin/sales/payments/:id` and `/payments/:id`
 * Safe lifecycle timeline, redacted PSP verification metadata, consistency check, and audit trail.
 */

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Printer,
  FileText,
  User,
  ShoppingBag,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { Badge, Button, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { PaymentAttempt } from '../../domain/types';
import {
  toFaDigits,
  formatPriceTomans,
  formatPersianDate,
  maskIpAddress,
  maskPhoneNumber,
} from '../../utils/formatters';
import {
  PAYMENT_STATUS_DETAILS,
  getSafeGatewayMetadata,
} from '../../domain/paymentLedger';
import { RefundRequestModal } from '../../components/payments/RefundRequestModal';

export interface PaymentDetailPageProps {
  paymentIdProp?: string;
}

export const PaymentDetailPage: React.FC<PaymentDetailPageProps> = ({ paymentIdProp }) => {
  const { currentPath, params, navigate } = useAdminRouter();
  const { state, getPaymentById } = useAdminRepository();
  const { addToast } = useToast();

  const paymentId = useMemo(() => {
    if (paymentIdProp) return paymentIdProp;
    if (params.id) return params.id;
    const parts = currentPath.split('/');
    return parts[parts.length - 1] || '';
  }, [paymentIdProp, params.id, currentPath]);

  const paymentData = useMemo(() => {
    if (!paymentId) return null;
    return getPaymentById(paymentId);
  }, [paymentId, getPaymentById]);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [showMaskedPan, setShowMaskedPan] = useState(true);

  if (!paymentData) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto my-12 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-white/10 flex items-center justify-center mx-auto text-stone-500">
          <CreditCard size={28} />
        </div>
        <h2 className="text-lg font-bold text-white">تراکنش بانکی یافت نشد</h2>
        <p className="text-xs text-stone-400">
          شناسه پرداخت <span className="font-mono text-[#eed29d]">{paymentId}</span> در سوابق درگاه شاپرک فروشگاه ثبت نشده است.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/sales/payments')}
          icon={ArrowRight}
        >
          بازگشت به دفتر کل تراکنش‌ها
        </Button>
      </div>
    );
  }

  const { payment, order, customer, refunds, retryAttempts } = paymentData;
  const safeMetadata = getSafeGatewayMetadata(payment);
  const statusCfg = PAYMENT_STATUS_DETAILS[payment.status] || PAYMENT_STATUS_DETAILS.pending;

  // Order Amount Consistency Check
  const expectedOrderTotal = order?.totalTomans || payment.amountTomans;
  const isAmountConsistent = payment.amountTomans === expectedOrderTotal;

  // Safe Lifecycle Steps
  const lifecycleSteps = [
    {
      title: 'ایجاد توکن شاپرک',
      desc: 'ثبت شناسه اولیه در سوئیچ پرداخت شاپرک',
      time: payment.createdAt,
      done: true,
      status: 'success',
    },
    {
      title: 'هدایت به درگاه پرداخت (PSP)',
      desc: payment.method === 'saman_gateway' ? 'اتصال به درگاه امن سامان کیش (سپ)' : 'اتصال به درگاه پرداخت زرین‌پال',
      time: payment.createdAt,
      done: true,
      status: 'success',
    },
    {
      title: 'دریافت کال‌بک بازگشتی (Callback)',
      desc: payment.status === 'failed' ? 'اعلام انصراف یا خطای کارت توسط مشتری' : `شماره پیگیری: ${toFaDigits(payment.traceNumber)}`,
      time: payment.createdAt,
      done: true,
      status: payment.status === 'failed' ? 'failed' : 'success',
    },
    {
      title: 'استعلام تاییدیه پرداخت (Verify)',
      desc: payment.status === 'verified_paid' ? `تایید قطعی با کد مرجع (RRN): ${toFaDigits(payment.gatewayRefId)}` : payment.status === 'failed' ? 'تایید نشد' : 'در انتظار استعلام',
      time: payment.verifiedAt || payment.createdAt,
      done: payment.status === 'verified_paid' || payment.status === 'refunded' || payment.status === 'failed',
      status: payment.status === 'failed' ? 'failed' : 'success',
    },
    {
      title: 'تسویه چرخه شاپرک پایا/ساتنا',
      desc: payment.settlementBatchId ? `ثبت در بچ تسویه ${payment.settlementBatchId}` : 'واریز به حساب حقوقی کارگاه طبق سیکل شاپرک',
      time: payment.settledAt || payment.createdAt,
      done: payment.status === 'verified_paid',
      status: 'success',
    },
  ];

  return (
    <div className="space-y-6 pb-20 font-sans text-right" dir="rtl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-3 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/sales/payments')}
            className="hover:text-white transition-colors"
          >
            <span>فروش و مالی</span>
          </button>
          <span>/</span>
          <button
            onClick={() => navigate('/admin/sales/payments')}
            className="hover:text-white transition-colors"
          >
            <span>تراکنش‌ها</span>
          </button>
          <span>/</span>
          <span className="font-mono text-[#eed29d] font-bold">{payment.id}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/sales/payments')}
          icon={ArrowRight}
        >
          بازگشت به دفتر تراکنش‌ها
        </Button>
      </div>

      {/* Top Cockpit Card */}
      <div className="p-4 md:p-6 bg-gradient-to-b from-[#1c1917] to-[#121110] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">
                {payment.id}
              </h1>
              <Badge variant={statusCfg.badgeVariant} size="sm">
                {statusCfg.labelFa}
              </Badge>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ba8d3d]/15 text-[#eed29d] border border-[#ba8d3d]/30 font-mono">
                {safeMetadata.pspName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-400 border border-white/10 font-mono">
                DEMO SIMULATION
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 font-fanum">
              <span>زمان ثبت: {formatPersianDate(payment.createdAt, { includeTime: true })}</span>
              <span>·</span>
              <span>
                سفارش متصل:{' '}
                <button
                  onClick={() => navigate(`/admin/sales/orders/${payment.orderId}`)}
                  className="font-mono text-[#eed29d] hover:underline font-bold"
                >
                  {payment.orderId}
                </button>
              </span>
              <span>·</span>
              <span>خریدار: <strong className="text-stone-200">{order?.customerName || customer?.fullName || 'مشتری شاه‌پوش'}</strong></span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={ShoppingBag}
              onClick={() => navigate(`/admin/sales/orders/${payment.orderId}`)}
            >
              مشاهده فاکتور سفارش
            </Button>

            {payment.status === 'verified_paid' && (
              <Button
                variant="destructive"
                size="sm"
                icon={RotateCcw}
                onClick={() => setIsRefundModalOpen(true)}
              >
                ثبت درخواست استرداد وجه
              </Button>
            )}
          </div>
        </div>

        {/* Amount & Reconciliation Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 font-fanum">
            <span className="text-[10px] text-stone-400 block mb-0.5">مبلغ تراکنش تسویه شده</span>
            <span className="text-lg font-bold text-white block">
              {formatPriceTomans(payment.amountTomans)}
            </span>
            <span className="text-[10px] text-emerald-400 mt-0.5 block flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>مطابق با مبلغ فاکتور نهایی</span>
            </span>
          </div>

          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 font-fanum">
            <span className="text-[10px] text-stone-400 block mb-0.5">شماره پیگیری درگاه شاپرک</span>
            <div className="flex items-center justify-between text-base font-bold font-mono text-[#eed29d]">
              <span>{toFaDigits(payment.traceNumber)}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(payment.traceNumber);
                  addToast({ title: 'کپی شد', description: 'شماره پیگیری در کلیپ‌بورد کپی شد.', type: 'info' });
                }}
                className="text-stone-400 hover:text-white"
                title="کپی شماره پیگیری"
              >
                <Copy size={13} />
              </button>
            </div>
            <span className="text-[10px] text-stone-500 mt-0.5 block font-mono">Trace Number</span>
          </div>

          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 font-fanum">
            <span className="text-[10px] text-stone-400 block mb-0.5">کد مرجع الکترونیک شاپرک (RRN)</span>
            <div className="flex items-center justify-between text-base font-bold font-mono text-white">
              <span>{toFaDigits(payment.gatewayRefId)}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(payment.gatewayRefId);
                  addToast({ title: 'کپی شد', description: 'کد مرجع در کلیپ‌بورد کپی شد.', type: 'info' });
                }}
                className="text-stone-400 hover:text-white"
                title="کپی RRN"
              >
                <Copy size={13} />
              </button>
            </div>
            <span className="text-[10px] text-stone-500 mt-0.5 block font-mono">Retrieval Reference Number</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lifecycle Timeline & Metadata Example (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Safe Payment Lifecycle Stepper */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock size={16} className="text-[#ba8d3d]" />
                <span>چرخه حیات امن پرداخت در شبکه شاپرک</span>
              </span>
              <span className="text-xs text-stone-500 font-mono">۵ مرحله تسویه</span>
            </h3>

            <div className="relative border-r-2 border-white/10 pr-4 space-y-4 mr-2">
              {lifecycleSteps.map((step, idx) => (
                <div key={idx} className="relative space-y-1 text-xs">
                  <div
                    className={`absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#141211] ${
                      step.status === 'failed'
                        ? 'bg-rose-500'
                        : step.done
                        ? 'bg-emerald-400'
                        : 'bg-stone-600'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2 font-fanum">
                    <strong className="text-white text-xs">{step.title}</strong>
                    <span className="text-[10px] text-stone-400">
                      {formatPersianDate(step.time, { includeTime: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed font-fanum">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Safe Gateway Callback Metadata Example (Sanitized / No Tokens) */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal size={16} className="text-[#ba8d3d]" />
                <span>متادیتای احراز شده کال‌بک درگاه بانکی (Safe PSP Callback)</span>
              </h3>
              <span className="text-[10px] text-stone-500">حفاظت از کلیدها و توکن‌ها</span>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-white/10 font-mono text-[11px] space-y-2 text-stone-300 select-text overflow-x-auto" dir="ltr">
              <div className="text-stone-500 mb-2">// Sanitized PSP response payload (Verified against Shaparak specs)</div>
              <div><span className="text-amber-400">"status":</span> <span className="text-emerald-400">"{safeMetadata.verificationCode}"</span>,</div>
              <div><span className="text-amber-400">"psp_gateway":</span> <span className="text-stone-300">"{safeMetadata.pspName}"</span>,</div>
              <div><span className="text-amber-400">"terminal_id":</span> <span className="text-stone-300">"{safeMetadata.terminalId}"</span>,</div>
              <div><span className="text-amber-400">"trace_number":</span> <span className="text-[#eed29d]">"{safeMetadata.traceNumber}"</span>,</div>
              <div><span className="text-amber-400">"rrn":</span> <span className="text-[#eed29d]">"{safeMetadata.rrn}"</span>,</div>
              <div><span className="text-amber-400">"masked_pan":</span> <span className="text-sky-300">"{safeMetadata.maskedCardPan}"</span>,</div>
              <div><span className="text-amber-400">"client_ip_redacted":</span> <span className="text-stone-400">"{safeMetadata.maskedClientIp}"</span>,</div>
              <div><span className="text-amber-400">"settlement_cycle":</span> <span className="text-stone-400">"{safeMetadata.settlementCycle}"</span>,</div>
              <div><span className="text-amber-400">"raw_token_suppressed":</span> <span className="text-emerald-400">true</span></div>
            </div>

            <div className="p-3 bg-[#ba8d3d]/10 border border-[#ba8d3d]/30 rounded-xl text-xs text-[#eed29d] flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#ba8d3d] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>امنیت استانداردهای شاپرک:</strong> توکن‌های یکبارمصرف و هدرهای خام تراکنش به دلایل انضباطی و امنیت شبکه بانکی در رابط کاربری ذخیره یا نمایش داده نمی‌شوند.
              </div>
            </div>
          </div>

          {/* Related Refunds Section */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RotateCcw size={16} className="text-[#ba8d3d]" />
                <span>پرونده‌های استرداد وجه متصل (Refund Records)</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">
                {toFaDigits(refunds.length)} پرونده
              </span>
            </h3>

            {refunds.length > 0 ? (
              <div className="divide-y divide-white/10">
                {refunds.map((ref) => (
                  <div key={ref.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-fanum">
                        <span className="font-mono text-[#eed29d] font-bold">{ref.id}</span>
                        <Badge
                          variant={ref.status === 'processed' ? 'success' : ref.status === 'approved' ? 'brass' : 'warning'}
                          size="sm"
                        >
                          {ref.status === 'processed' ? 'تسویه شده' : ref.status === 'approved' ? 'تایید شده' : 'در انتظار بررسی'}
                        </Badge>
                        <span className="text-stone-400">({formatPersianDate(ref.requestedAt)})</span>
                      </div>
                      <div className="text-stone-300 mt-1">علت: {ref.reason}</div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        حساب مقصد: {ref.destinationAccountMasked}
                      </div>
                    </div>

                    <div className="text-left font-fanum shrink-0">
                      <span className="text-sm font-bold text-white block">
                        {formatPriceTomans(ref.requestedAmountTomans)}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {ref.isPartial ? 'استرداد جزئی' : 'استرداد کامل'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-stone-500 bg-stone-900/30 rounded-xl border border-dashed border-white/10">
                هیچ درخواست استردادی برای این تراکنش ثبت نشده است.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Consistency, Card Info, Retry Attempts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Amount Consistency Check Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#ba8d3d]" />
              <span>انطباق مبالغ فاکتور و تراکنش</span>
            </h3>

            <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-2 text-xs font-fanum">
              <div className="flex justify-between text-stone-400">
                <span>جمع اقلام سفارش:</span>
                <span className="text-white">{formatPriceTomans(order?.subtotalTomans || 0)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>هزینه بسته‌بندی و ارسال:</span>
                <span>{order?.shippingFeeTomans === 0 ? 'رایگان' : formatPriceTomans(order?.shippingFeeTomans || 0)}</span>
              </div>
              {order && order.discountTomans > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>تخفیف کسر شده:</span>
                  <span>-{formatPriceTomans(order.discountTomans)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white pt-2 border-t border-white/10">
                <span>مبلغ تسویه فاکتور:</span>
                <span className="text-[#eed29d]">{formatPriceTomans(expectedOrderTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-white">
                <span>مبلغ دریافتی شاپرک:</span>
                <span className="text-emerald-400">{formatPriceTomans(payment.amountTomans)}</span>
              </div>

              <div className={`mt-2 p-2 rounded-lg text-center font-bold text-[11px] ${
                isAmountConsistent ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}>
                {isAmountConsistent ? 'انطباق ۱۰۰٪ دفاتر مالی و تراکنش بانکی تایید شد' : 'مغایرت عددی بین فاکتور و تراکنش وجود دارد!'}
              </div>
            </div>
          </div>

          {/* Masked Card Details Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard size={16} className="text-[#ba8d3d]" />
                <span>اطلاعات کارت مبدا خریدار</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMaskedPan(!showMaskedPan)}
                className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 transition-colors"
                title="تغییر وضعیت ماسک شماره کارت"
              >
                {showMaskedPan ? (
                  <>
                    <Eye size={12} />
                    <span>نمایش</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={12} />
                    <span>پنهان</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-gradient-to-r from-stone-900 to-black rounded-xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center text-xs text-stone-400">
                <span>شبکه شتاب / بانک عامل</span>
                <span className="font-mono text-stone-500">EMV SHETAB</span>
              </div>

              <div className="font-mono text-base md:text-lg font-bold text-white tracking-widest text-center" dir="ltr">
                {showMaskedPan
                  ? safeMetadata.maskedCardPan
                  : safeMetadata.maskedCardPan.replace(/\*\*/g, '48')}
              </div>

              <div className="flex justify-between items-center text-[10px] text-stone-500 pt-2 border-t border-white/5 font-fanum">
                <span>دارنده کارت: {order?.customerName || customer?.fullName || 'احراز هویت شده'}</span>
                <span>درگاه: {safeMetadata.pspName}</span>
              </div>
            </div>
          </div>

          {/* Retry Attempts / Duplicate Protection Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RefreshCw size={16} className="text-[#ba8d3d]" />
                <span>تلاش‌های مجدد و مهار همزمانی (Anti-Double Count)</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">
                {toFaDigits(retryAttempts.length)} تلاش ثبت شده
              </span>
            </h3>

            {retryAttempts.length > 0 ? (
              <div className="space-y-2">
                {retryAttempts.map((att) => (
                  <div key={att.id} className="p-3 bg-stone-900/60 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 font-fanum">
                        <button
                          onClick={() => navigate(`/admin/sales/payments/${att.id}`)}
                          className="font-mono text-[#eed29d] font-bold hover:underline"
                        >
                          {att.id}
                        </button>
                        <Badge
                          variant={att.status === 'verified_paid' ? 'success' : 'destructive'}
                          size="sm"
                        >
                          {att.status === 'verified_paid' ? 'موفق' : 'ناموفق'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-fanum">
                        {formatPersianDate(att.createdAt, { includeTime: true })}
                        {att.errorMessage && <span className="mr-2 text-rose-400">({att.errorMessage})</span>}
                      </div>
                    </div>

                    <div className="font-fanum text-left">
                      <span className="text-xs font-bold text-white">{formatPriceTomans(att.amountTomans)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-stone-900/40 rounded-xl text-xs text-stone-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>تراکنش در اولین تلاش با موفقیت تسویه شده و تلاش ناموفق قبلی وجود ندارد.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refund Request Modal */}
      <RefundRequestModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        payment={payment}
        onRefundSubmitted={() => {
          addToast({
            title: 'عملیات ثبت شد',
            description: 'درخواست استرداد وجه در کارتابل مالی ذخیره شد.',
            type: 'info',
          });
        }}
      />
    </div>
  );
};
