/**
 * Shahpoosh Luxury Streetwear - Refunds Operations Ledger
 * Dedicated page for `/admin/sales/refunds` and `/refunds`
 * Enforces capped refund amounts, review approvals, and simulated settlement execution.
 */

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, Pagination, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { RefundRecord, RefundStatus } from '../../domain/types';
import { toFaDigits, formatPriceTomans, formatPersianDate } from '../../utils/formatters';

export const RefundsPage: React.FC = () => {
  const { state, getRefunds, approveRefund, processRefund, getFinancialLedgerSummary } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refundsList = useMemo(() => {
    return getRefunds();
  }, [getRefunds, state.refunds]);

  const summary = useMemo(() => {
    return getFinancialLedgerSummary();
  }, [getFinancialLedgerSummary, state.payments, state.refunds]);

  // Filtered Refunds
  const filteredRefunds = useMemo(() => {
    let list = [...refundsList];

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.paymentId.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    // Sort latest first
    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return list;
  }, [refundsList, statusFilter, search]);

  const total = filteredRefunds.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedRefunds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRefunds.slice(start, start + pageSize);
  }, [filteredRefunds, currentPage, pageSize]);

  // Actions
  const handleApprove = (refundId: string) => {
    const res = approveRefund(refundId, state.staff[0]?.id || 'STF-01');
    if (res.success) {
      addToast({
        title: 'درخواست استرداد تایید شد',
        description: 'پرونده جهت صدور حواله پایا به صف تسویه منتقل شد.',
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطا در تایید',
        description: res.error || 'امکان تغییر وضعیت وجود ندارد.',
        type: 'error',
      });
    }
  };

  const handleProcess = (refundId: string) => {
    const res = processRefund(refundId, state.staff[0]?.id || 'STF-01');
    if (res.success) {
      addToast({
        title: 'تسویه استرداد با موفقیت نهایی شد',
        description: 'مبلغ استرداد از فروش ناخالص کسر و تعهدات رزرو انبار آزاد گردید.',
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطا در تسویه',
        description: res.error || 'عملیات با خطا مواجه شد.',
        type: 'error',
      });
    }
  };

  const columns: ColumnDef<RefundRecord>[] = [
    {
      key: 'id',
      header: 'شناسه استرداد',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-[#eed29d] text-xs block">{row.id}</span>
          <span className="text-[10px] text-stone-400 font-fanum">{formatPersianDate(row.requestedAt)}</span>
        </div>
      ),
    },
    {
      key: 'orderId',
      header: 'فاکتور و تراکنش متصل',
      render: (row) => (
        <div className="space-y-0.5 font-mono text-xs">
          <button
            onClick={() => navigate(`/admin/sales/orders/${row.orderId}`)}
            className="text-white hover:text-[#eed29d] hover:underline font-bold block"
          >
            {row.orderId}
          </button>
          <button
            onClick={() => navigate(`/admin/sales/payments/${row.paymentId}`)}
            className="text-[11px] text-stone-400 hover:text-white block"
          >
            {row.paymentId}
          </button>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'خریدار و حساب واریز',
      render: (row) => (
        <div className="max-w-[200px]">
          <div className="font-bold text-white text-xs truncate">{row.customerName}</div>
          <div className="text-[10px] text-stone-400 font-mono truncate mt-0.5" dir="ltr">
            {row.destinationAccountMasked}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'مبلغ استرداد',
      render: (row) => (
        <div className="font-fanum text-left">
          <span className="font-bold text-white text-xs block">
            {formatPriceTomans(row.requestedAmountTomans)}
          </span>
          <span className="text-[10px] text-stone-400">
            {row.isPartial ? 'استرداد جزئی' : 'استرداد کامل'}
          </span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'علت استرداد',
      render: (row) => (
        <span className="text-xs text-stone-300 line-clamp-2 max-w-[220px]">
          {row.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت بررسی',
      render: (row) => {
        const variants: Record<RefundStatus, any> = {
          requested: 'warning',
          approved: 'brass',
          processed: 'success',
          rejected: 'destructive',
        };
        const labels: Record<RefundStatus, string> = {
          requested: 'در انتظار تایید مالی',
          approved: 'تاییدشده / در صف پایا',
          processed: 'تسویه نهایی شده',
          rejected: 'رد شده',
        };
        return (
          <Badge variant={variants[row.status]} size="sm">
            {labels[row.status]}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'اقدام کارشناسی',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'requested' && (
            <Button
              variant="brass"
              size="sm"
              className="text-[11px] py-1 px-2.5 h-7"
              onClick={() => handleApprove(row.id)}
            >
              تایید درخواست
            </Button>
          )}

          {row.status === 'approved' && (
            <Button
              variant="success"
              size="sm"
              className="text-[11px] py-1 px-2.5 h-7 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => handleProcess(row.id)}
            >
              اجرای تسویه
            </Button>
          )}

          {row.status === 'processed' && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 font-fanum">
              <CheckCircle2 size={13} />
              <span>تسویه قطعی</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      {/* Page Header */}
      <AdminPageHeader
        title="مدیریت و تسویه استرداد وجه (Refunds Ledger)"
        description="سامانه یکپارچه رسیدگی به مرجوعی‌ها، کنترل سقف مبالغ قابل استرداد و ثبت اسناد بستانکار حسابداری."
        badge={toFaDigits(refundsList.length)}
        badgeVariant="brass"
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-xs text-stone-400 block mb-1">مجموع مبالغ مسترد شده قطعی</span>
          <span className="text-xl font-bold text-white block">
            {formatPriceTomans(summary.totalProcessedRefundsTomans)}
          </span>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            کسر شده از فروش ناخالص در دفاتر رسمی
          </span>
        </div>

        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-xs text-stone-400 block mb-1">تعداد پرونده‌های استرداد</span>
          <span className="text-xl font-bold text-[#eed29d] block">
            {toFaDigits(refundsList.length)} پرونده
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">
            شامل {toFaDigits(refundsList.filter((r) => r.status === 'processed').length)} تسویه موفق
          </span>
        </div>

        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl font-fanum">
          <span className="text-xs text-stone-400 block mb-1">درخواست‌های در صف بررسی مالی</span>
          <span className="text-xl font-bold text-amber-400 block">
            {toFaDigits(refundsList.filter((r) => r.status === 'requested' || r.status === 'approved').length)} مورد
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">نیاز به تایید مدیر مالی</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="جستجو در شناسه استرداد، کد فاکتور، نام خریدار یا دلیل..."
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام وضعیت‌های استرداد</option>
              <option value="requested">در انتظار تایید</option>
              <option value="approved">تاییدشده در صف پایا</option>
              <option value="processed">تسویه نهایی شده</option>
              <option value="rejected">رد شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          columns={columns}
          data={paginatedRefunds}
          keyExtractor={(row) => row.id}
          emptyMessage="هیچ پرونده استردادی با این مشخصات یافت نشد."
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
  );
};
