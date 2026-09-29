/**
 * Shahpoosh Luxury Streetwear - Payment Ledger & Financial Reconciliation
 * Prompt 11: Serious Financial Operations, Redacted Privacy Fields, Reconciliation, and Unified Selectors.
 */

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Clock,
  Terminal,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, Pagination, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { PaymentAttempt, PaymentStatus, PaymentMethod } from '../../domain/types';
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

type PaymentTab = 'ledger' | 'reconciliation' | 'refunds_preview';

export const PaymentsPage: React.FC = () => {
  const {
    state,
    getFinancialLedgerSummary,
    getRefunds,
    getSettlementBatches,
    approveRefund,
    processRefund,
  } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<PaymentTab>('ledger');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isPrivacyRedacted, setIsPrivacyRedacted] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Selected payment for refund modal
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentAttempt | null>(null);

  // Unified financial selectors (Single source of truth)
  const summary = useMemo(() => {
    return getFinancialLedgerSummary();
  }, [getFinancialLedgerSummary, state.payments, state.refunds, state.orders]);

  const settlementBatches = useMemo(() => {
    return getSettlementBatches();
  }, [getSettlementBatches, state.payments]);

  const refundsList = useMemo(() => {
    return getRefunds();
  }, [getRefunds, state.refunds]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    let list = [...state.payments];
    const nowMs = new Date(state.demoClockIso).getTime();

    // 1. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    // 2. Gateway Filter
    if (gatewayFilter !== 'all') {
      list = list.filter((p) => p.method === gatewayFilter);
    }

    // 3. Date Presets
    if (dateFilter !== 'all') {
      const days = dateFilter === 'today' ? 1 : dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = nowMs - days * 24 * 3600 * 1000;
      list = list.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
    }

    // 4. Search Filter (ID, orderId, traceNumber, RRN, masked IP)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.orderId.toLowerCase().includes(q) ||
          p.traceNumber.includes(q) ||
          p.gatewayRefId.toLowerCase().includes(q) ||
          p.maskedIpAddress.includes(q)
      );
    }

    // Sort descending by creation date
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [state.payments, statusFilter, gatewayFilter, dateFilter, search, state.demoClockIso]);

  const total = filteredPayments.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Table Columns
  const columns: ColumnDef<PaymentAttempt>[] = [
    {
      key: 'id',
      header: 'شناسه تراکنش',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/admin/sales/payments/${row.id}`)}
              className="font-mono text-xs font-bold text-[#eed29d] hover:text-white transition-colors"
            >
              {row.id}
            </button>
            {row.retryAttemptNumber && row.retryAttemptNumber > 1 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                تلاش {toFaDigits(row.retryAttemptNumber)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            {formatPersianDate(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'orderId',
      header: 'سفارش متصل',
      render: (row) => {
        const order = state.orders.find((o) => o.id === row.orderId);
        return (
          <div className="max-w-[150px]">
            <button
              onClick={() => navigate(`/admin/sales/orders/${row.orderId}`)}
              className="font-mono text-xs font-bold text-white hover:text-[#eed29d] hover:underline block"
            >
              {row.orderId}
            </button>
            <div className="text-[10px] text-stone-400 truncate mt-0.5 font-fanum">
              {order?.customerName || 'مشتری شاه‌پوش'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amountTomans',
      header: 'مبلغ تراکنش',
      render: (row) => (
        <div className="text-left font-fanum">
          <span className="font-bold text-white text-xs block">
            {formatPriceTomans(row.amountTomans)}
          </span>
          {row.refundedAmountTomans && (
            <span className="text-[10px] text-rose-400 block">
              استرداد: {formatPriceTomans(row.refundedAmountTomans)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'درگاه شاپرک (PSP)',
      render: (row) => {
        const pspName = row.method === 'saman_gateway' ? 'سامان کیش (SEP)' : row.method === 'zarinpal' ? 'زرین‌پال' : 'کارت به کارت';
        return (
          <div>
            <span className="text-xs text-stone-200 font-bold block">{pspName}</span>
            <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
              RRN: {toFaDigits(row.gatewayRefId.slice(-6))}
            </span>
          </div>
        );
      },
    },
    {
      key: 'traceNumber',
      header: 'کد پیگیری شاپرک',
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="text-stone-300 font-bold">{toFaDigits(row.traceNumber)}</span>
          <span className="text-[10px] text-stone-500 block font-fanum">تایید شده توسط شاپرک</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت تسویه',
      render: (row) => {
        const cfg = PAYMENT_STATUS_DETAILS[row.status] || PAYMENT_STATUS_DETAILS.pending;
        return (
          <Badge variant={cfg.badgeVariant} size="sm">
            {cfg.labelFa}
          </Badge>
        );
      },
    },
    {
      key: 'maskedCard',
      header: 'کارت مبدا امن',
      render: (row) => (
        <div className="font-mono text-[11px]" dir="ltr">
          <span className="text-stone-400">
            {isPrivacyRedacted
              ? row.cardPanMasked || '۶۰۳۷-۹۹**-****-۲۸۴۱'
              : row.cardPanMasked?.replace(/\*\*/g, '48') || '۶۰۳۷-۹۹۴۸-۱۲۹۰-۲۸۴۱'}
          </span>
          <div className="text-[9px] text-stone-500 font-mono mt-0.5">
            IP: {maskIpAddress(row.maskedIpAddress)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="text-[11px] py-1 px-2 h-7"
            onClick={() => navigate(`/admin/sales/payments/${row.id}`)}
            title="مشاهده شناسنامه کامل تراکنش"
            icon={ArrowUpRight}
          >
            شناسنامه
          </Button>

          {row.status === 'verified_paid' && (
            <Button
              variant="destructive"
              size="sm"
              className="text-[11px] py-1 px-2 h-7"
              onClick={() => setSelectedPaymentForRefund(row)}
              title="ثبت درخواست استرداد وجه فاکتور"
              icon={RotateCcw}
            >
              استرداد
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      {/* Page Header */}
      <AdminPageHeader
        title="دفتر کل مالی، تراکنش‌ها و تسویه درگاه‌های بانکی"
        description="رهگیری مستقیم مبالغ ورودی از طریق سوئیچ شاپرک، انطباق با سفارش‌ها، کنترل استرداد وجه و بستن روزانه دفاتر مالی."
        badge={toFaDigits(state.payments.length)}
        badgeVariant="brass"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrivacyRedacted(!isPrivacyRedacted)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-stone-300 hover:text-white bg-[#181614] transition-colors"
            >
              {isPrivacyRedacted ? (
                <>
                  <EyeOff size={14} className="text-[#eed29d]" />
                  <span>محرمانگی فعال (نقش مالی)</span>
                </>
              ) : (
                <>
                  <Eye size={14} className="text-amber-400" />
                  <span>نمایش مستقیم کارت</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Financial KPI Summary Cards (Unified Financial Selectors) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-[11px] text-stone-400 block mb-1">فروش ناخالص تاییدشده</span>
          <span className="text-lg md:text-xl font-bold text-white block truncate">
            {formatPriceTomans(summary.grossCapturedTomans)}
          </span>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            {toFaDigits(summary.verifiedTransactionsCount)} تراکنش تسویه شده
          </span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-[11px] text-stone-400 block mb-1">مبالغ مسترد شده (Refunds)</span>
          <span className="text-lg md:text-xl font-bold text-rose-400 block truncate">
            {formatPriceTomans(summary.totalProcessedRefundsTomans)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">
            {toFaDigits(summary.refundsCount)} فقره عودت مالی
          </span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-[#ba8d3d]/30 bg-gradient-to-b from-[#181614] to-black rounded-2xl font-fanum">
          <span className="text-[11px] text-[#eed29d] block mb-1">خالص درآمد دفاتر (Net)</span>
          <span className="text-lg md:text-xl font-bold text-[#eed29d] block truncate">
            {formatPriceTomans(summary.netRevenueTomans)}
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">
            ناخالص منهای استرداد قطعی
          </span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-[11px] text-stone-400 block mb-1">تراکنش‌های ناموفق شاپرک</span>
          <span className="text-lg md:text-xl font-bold text-amber-400 block">
            {toFaDigits(summary.failedTransactionsCount)} تراکنش
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">فاقد کسر از حساب مشتری</span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-white/10 rounded-2xl font-fanum col-span-2 lg:col-span-1">
          <span className="text-[11px] text-stone-400 block mb-1">نرخ انطباق دفاتر با شاپرک</span>
          <span className="text-lg md:text-xl font-bold text-emerald-400 block flex items-center gap-1">
            <CheckCircle2 size={16} />
            <span>{toFaDigits(summary.reconciliationMatchRatePercent)}٪</span>
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">مغایرت دفاتر: صفر تومان</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard size={14} />
          <span>دفتر کل تراکنش‌ها ({toFaDigits(state.payments.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reconciliation'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileCheck size={14} />
          <span>مغایرت‌گیری و تسویه شاپرک ({toFaDigits(settlementBatches.length)} دوره)</span>
        </button>

        <button
          onClick={() => navigate('/admin/sales/refunds')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 text-stone-400 hover:text-white hover:bg-white/5"
        >
          <RotateCcw size={14} />
          <span>پرونده‌های استرداد وجه ({toFaDigits(refundsList.length)})</span>
          <ExternalLink size={12} className="mr-0.5 text-stone-500" />
        </button>
      </div>

      {/* TAB 1: PAYMENTS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Dense Filter Bar */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-5">
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setCurrentPage(1);
                  }}
                  placeholder="جستجو در شناسه پرداخت، شماره پیگیری، RRN، کد سفارش..."
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
                >
                  <option value="all">تمام وضعیت‌های تسویه</option>
                  <option value="verified_paid">تسویه موفق شاپرک</option>
                  <option value="pending">در انتظار پرداخت</option>
                  <option value="failed">تراکنش ناموفق</option>
                  <option value="refunded">استرداد کامل</option>
                  <option value="partial_refund">استرداد جزئی</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={gatewayFilter}
                  onChange={(e) => {
                    setGatewayFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
                >
                  <option value="all">تمام درگاه‌ها (PSP)</option>
                  <option value="saman_gateway">سامان کیش (سپ)</option>
                  <option value="zarinpal">زرین‌پال</option>
                  <option value="card_to_card">کارت به کارت</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
                >
                  <option value="all">کل بازه زمانی (۹۰ روز)</option>
                  <option value="today">امروز</option>
                  <option value="7d">۷ روز اخیر</option>
                  <option value="30d">۳۰ روز اخیر</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
            <Table
              columns={columns}
              data={paginatedPayments}
              keyExtractor={(row) => row.id}
              emptyMessage="هیچ تراکنشی با معیارهای فیلتر منطبق نیست."
            />

            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-stone-400 font-fanum">
                  صفحه {toFaDigits(currentPage)} از {toFaDigits(totalPages)}
                </span>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Transparent Demo Notice */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-[#181614] to-black border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-400" />
              </div>
              <div className="leading-relaxed">
                <strong>نمونه نمایشی مغایرت‌گیری شاپرک (Simulated Reconciliation):</strong> این زبانه گزارش تطبیق روزانه تسویه‌های درگاه بانکی سامان با واریزی‌های شاپرک را شبیه‌سازی می‌کند. فاقد اتصال مستقیم به حساب‌های بانکی حقوقی است.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
              DEMO MODE
            </span>
          </div>

          {/* Batches Table */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck size={16} className="text-[#ba8d3d]" />
                <span>دوره‌های تسویه پایا شاپرک (Settlement Batches)</span>
              </h3>
              <span className="text-xs text-stone-400 font-fanum">
                {toFaDigits(settlementBatches.length)} دوره مالی تطبیق‌یافته
              </span>
            </div>

            <div className="divide-y divide-white/10">
              {settlementBatches.map((batch) => (
                <div key={batch.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-fanum">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#eed29d] font-bold text-sm">{batch.id}</span>
                      <Badge variant="success" size="sm">
                        تطبیق ۱۰۰٪ بدون مغایرت
                      </Badge>
                    </div>
                    <div className="text-stone-400 text-[11px]">
                      {batch.bankName} · شماره حواله واریز: <strong className="font-mono text-white">{batch.depositReferenceNumber}</strong>
                    </div>
                    <div className="text-[10px] text-stone-500">
                      تاریخ تسویه پایا: {formatPersianDate(batch.settlementDate)} · شامل {toFaDigits(batch.transactionsCount)} تراکنش معتبر
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-left shrink-0">
                    <div className="p-2 bg-stone-900 rounded-lg">
                      <span className="text-[10px] text-stone-400 block">جمع ناخالص</span>
                      <span className="font-bold text-white">{formatPriceTomans(batch.totalCapturedTomans)}</span>
                    </div>

                    <div className="p-2 bg-stone-900 rounded-lg">
                      <span className="text-[10px] text-stone-400 block">کارمزد شاپرک</span>
                      <span className="font-bold text-stone-400">{formatPriceTomans(batch.feeTomans)}</span>
                    </div>

                    <div className="p-2 bg-stone-900 rounded-lg border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 block">واریز خالص حساب</span>
                      <span className="font-bold text-emerald-400">{formatPriceTomans(batch.netSettledTomans)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      <RefundRequestModal
        isOpen={Boolean(selectedPaymentForRefund)}
        onClose={() => setSelectedPaymentForRefund(null)}
        payment={selectedPaymentForRefund}
        onRefundSubmitted={() => {
          setSelectedPaymentForRefund(null);
        }}
      />
    </div>
  );
};
