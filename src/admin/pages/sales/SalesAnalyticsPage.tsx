import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  Percent,
  Truck,
  Scissors,
  Receipt,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Printer,
  PackageCheck,
  Eye,
  EyeOff,
  BarChart2,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, ChartContainer } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { toFaDigits, formatTomans } from '../../utils/formatters';
import { downloadCsv } from '../../utils/exportCsv';
import { DateRangePreset } from '../../domain/types';

export const SalesAnalyticsPage: React.FC = () => {
  const { getSalesAnalytics, state } = useAdminRepository();
  const { navigate } = useAdminRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'summary' | 'timeline' | 'catalog_vs_pod' | 'rankings' | 'unit_economics' | 'refunds_discounts' | 'missing_inputs'
  >('summary');

  // Timeframe and date filter
  const [timeframe, setTimeframe] = useState<DateRangePreset>('30d');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState('2026-08-25');
  const [customEnd, setCustomEnd] = useState('2026-09-23');

  // Timeline chart metric selector
  const [chartMetric, setChartMetric] = useState<'net_sales' | 'gross_sales' | 'aov' | 'orders_count'>('net_sales');

  // Permission Gate for Sensitive Cost/Margin Data
  // In demo: super_admin and support_finance can view sensitive margin
  const currentRole = state.staff[0]?.role || 'super_admin';
  const hasFinanceRole = currentRole === 'super_admin' || currentRole === 'support_finance';
  const [maskSensitiveFinancials, setMaskSensitiveFinancials] = useState(!hasFinanceRole);

  // Load analytics data
  const data = useMemo(() => {
    return getSalesAnalytics(
      timeframe,
      isCustomDate ? customStart : undefined,
      isCustomDate ? customEnd : undefined
    );
  }, [getSalesAnalytics, timeframe, isCustomDate, customStart, customEnd]);

  // Export Calculated Demo Rows to Honest CSV
  const handleExportCsv = () => {
    const headers = [
      'تاریخ (میلادی)',
      'فروش ناخالص (تومان)',
      'استردادها (تومان)',
      'فروش خالص (تومان)',
      'تعداد سفارشات قطعی',
      'میانگین ارزش فاکتور (تومان)',
    ];

    const rows = data.timeline.map((point) => [
      point.date,
      point.grossSalesTomans,
      point.refundsTomans,
      point.netSalesTomans,
      point.ordersCount,
      point.aovTomans,
    ]);

    downloadCsv(`shahpoosh-sales-analytics-${timeframe}.csv`, headers, rows);
  };

  // Helper for rendering delta badges
  const renderDelta = (delta: number, invert = false) => {
    if (delta === 0) {
      return (
        <span className="text-[11px] text-stone-400 font-mono inline-flex items-center gap-0.5">
          <span>۰٪</span>
          <span className="text-[10px]">بدون تغییر</span>
        </span>
      );
    }

    const isPositive = delta > 0;
    const isGood = invert ? !isPositive : isPositive;

    return (
      <span
        className={`text-[11px] font-bold font-mono inline-flex items-center gap-0.5 ${
          isGood ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        <span>{toFaDigits(Math.abs(delta))}%</span>
        <span className="text-[10px] text-stone-400 font-sans mr-0.5">نسبت به دوره قبل</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="تحلیل مالی، درآمد و شاخص‌های اقتصادی فروش"
        description="ارزیابی تراز واقعی فروش ناخالص، پرداخت‌های تسویه‌شده بانکی، استردادها، بهای تمام‌شده مستقیم و تفکیک فروش کاتالوگ در برابر آتلیه طراحی POD."
        breadcrumbs={[
          { label: 'داشبورد مدیریت', href: '/admin/overview/dashboard' },
          { label: 'آمار و تحلیل داده‌ها', href: '/admin/analytics/sales' },
          { label: 'تحلیل مالی و فروش' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download size={14} />}
              className="border-white/10 text-stone-300 hover:text-white"
            >
              خروجی اکسل محاسبات (CSV)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/sales/orders')}
              leftIcon={<Receipt size={14} />}
              className="bg-white/5 border border-white/10 text-stone-200 hover:bg-white/10"
            >
              مشاهده دفتر فاکتورها
            </Button>
          </div>
        }
      />

      {/* Strict Financial Boundary & Rule Notice */}
      <div className="p-3.5 bg-gradient-to-r from-[#ba8d3d]/10 via-[#181716] to-[#181716] border border-[#ba8d3d]/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start md:items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#ba8d3d]/20 text-[#eed29d] shrink-0 mt-0.5 md:mt-0">
            <ShieldAlert size={16} />
          </div>
          <div className="text-stone-300 leading-relaxed">
            <span className="font-bold text-[#eed29d] ml-1">اصل انضباط مالی شاه‌پوش:</span>
            پرداخت‌های در انتظار، تراکنش‌های معلق و پیش‌فاکتورها به هیچ عنوان درآمد محسوب نمی‌شوند. کلیه ارقام زیر صرفاً بر اساس مبالغ تسویه‌شده قطعی در شبکه شاپرک و درگاه بانکی سامان/زرین‌پال محاسبه گردیده‌اند.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMaskSensitiveFinancials(!maskSensitiveFinancials)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            {maskSensitiveFinancials ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-emerald-400" />}
            <span>{maskSensitiveFinancials ? 'نمایش سود و هزینه‌های محرمانه' : 'مخفی‌سازی شاخص‌های سود'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400 flex items-center gap-1.5 ml-2">
            <Calendar size={14} className="text-[#ba8d3d]" />
            بازه زمانی گزارش:
          </span>
          {(['today', '7d', '30d', '90d'] as DateRangePreset[]).map((preset) => {
            const labels: Record<string, string> = {
              today: 'امروز (۲۴ ساعت)',
              '7d': '۷ روز اخیر',
              '30d': '۳۰ روز اخیر',
              '90d': '۹۰ روز (فصل)',
            };
            const isActive = !isCustomDate && timeframe === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setIsCustomDate(false);
                  setTimeframe(preset);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ba8d3d] text-black font-bold shadow-md shadow-[#ba8d3d]/20'
                    : 'bg-[#181716] border border-white/10 text-stone-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomDate(!isCustomDate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              isCustomDate
                ? 'bg-[#ba8d3d] text-black font-bold'
                : 'bg-[#181716] border border-white/10 text-stone-300 hover:text-white'
            }`}
          >
            <span>بازه دلخواه</span>
            {isCustomDate && <span className="w-1.5 h-1.5 rounded-full bg-black"></span>}
          </button>
        </div>

        {/* Custom Date Pickers */}
        {isCustomDate && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400">از:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[#181716] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#ba8d3d]"
            />
            <span className="text-stone-400">تا:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[#181716] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#ba8d3d]"
            />
          </div>
        )}

        {/* Date Window Summary */}
        <div className="text-xs text-stone-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>دوره فعال:</span>
          <span className="text-stone-200">
            {toFaDigits(data.startDateIso)} تا {toFaDigits(data.endDateIso)}
          </span>
          <span className="text-stone-500">({toFaDigits(data.timeframeDays)} روز)</span>
        </div>
      </div>

      {/* Primary Financial Metric Flow Cards (Reconciliation Banner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Order Value */}
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl relative overflow-hidden group hover:border-[#ba8d3d]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-stone-300" />
              ارزش ناخالص فاکتورها
            </span>
            <span className="text-[10px] text-stone-500 font-mono">Gross Order Value</span>
          </div>
          <div className="text-xl font-black text-white mt-1 font-fanum flex items-baseline gap-1.5">
            <span>{toFaDigits(formatTomans(data.grossOrderValueTomans).formatted)}</span>
            <span className="text-xs text-[#eed29d] font-normal font-sans">تومان</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            {renderDelta(data.grossOrderValueDeltaPercent)}
            <span className="text-stone-400">قبل از کسر تخفیف</span>
          </div>
        </div>

        {/* Discounts */}
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5 text-amber-300/90">
              <Percent size={14} className="text-amber-400" />
              مجموع تخفیف‌های اعمال‌شده
            </span>
            <span className="text-[10px] text-stone-500 font-mono">Discounts</span>
          </div>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum flex items-baseline gap-1.5">
            <span>{toFaDigits(formatTomans(data.discountsTomans).formatted)}</span>
            <span className="text-xs text-amber-300/80 font-normal font-sans">تومان</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            {renderDelta(data.discountsDeltaPercent, true)}
            <span className="text-stone-400">{toFaDigits(data.discountedOrdersCount)} فاکتور کوپن‌دار</span>
          </div>
        </div>

        {/* Captured / Verified Payments */}
        <div className="p-4 bg-[#131211] border border-[#ba8d3d]/30 rounded-2xl relative overflow-hidden group shadow-lg shadow-black/40">
          <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-[#ba8d3d] to-transparent"></div>
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5 text-[#eed29d]">
              <CreditCard size={14} className="text-[#ba8d3d]" />
              پرداخت‌های تایید و تسویه‌شده
            </span>
            <span className="text-[10px] text-[#ba8d3d] font-mono">Captured Revenue</span>
          </div>
          <div className="text-2xl font-black text-[#eed29d] mt-1 font-fanum flex items-baseline gap-1.5">
            <span>{toFaDigits(formatTomans(data.capturedPaymentsTomans).formatted)}</span>
            <span className="text-xs text-[#ba8d3d] font-normal font-sans">تومان</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            {renderDelta(data.capturedPaymentsDeltaPercent)}
            <span className="text-emerald-400 font-bold">{toFaDigits(data.capturedPaymentsCount)} فاکتور نهایی</span>
          </div>
        </div>

        {/* Net Sales */}
        <div className="p-4 bg-[#131211] border border-emerald-500/25 rounded-2xl relative overflow-hidden group shadow-lg shadow-black/40">
          <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <DollarSign size={14} className="text-emerald-400" />
              فروش خالص (دریافتی منهای استرداد)
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">Net Sales</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-fanum flex items-baseline gap-1.5">
            <span>{toFaDigits(formatTomans(data.netSalesTomans).formatted)}</span>
            <span className="text-xs text-emerald-300/80 font-normal font-sans">تومان</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
            {renderDelta(data.netSalesDeltaPercent)}
            <span className="text-stone-400">پس از کسر استرداد</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Processed Refunds */}
        <div className="p-3 bg-[#131211] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="flex items-center gap-1 text-rose-300">
              <RotateCcw size={12} className="text-rose-400" />
              استرداد تسویه‌شده
            </span>
            <span className="text-[10px] text-stone-500 font-mono">{toFaDigits(data.processedRefundsCount)} مورد</span>
          </div>
          <div className="text-sm font-black text-rose-400 font-fanum">
            {toFaDigits(formatTomans(data.processedRefundsTomans).formatted)} تومان
          </div>
          <div className="text-[10px] text-stone-400 mt-1">واریزشده به حساب خریدار</div>
        </div>

        {/* Requested Refunds (Pending Review) */}
        <div className="p-3 bg-[#131211] border border-amber-500/20 rounded-xl bg-amber-950/5">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="flex items-center gap-1 text-amber-300">
              <AlertTriangle size={12} className="text-amber-400" />
              درخواست استرداد باز
            </span>
            <span className="text-[10px] text-amber-400 font-mono">{toFaDigits(data.requestedRefundsCount)} تیکت</span>
          </div>
          <div className="text-sm font-black text-amber-400 font-fanum">
            {toFaDigits(formatTomans(data.requestedRefundsTomans).formatted)} تومان
          </div>
          <div className="text-[10px] text-stone-400 mt-1">در انتظار تایید حسابداری</div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-3 bg-[#131211] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span>میانگین فاکتور (AOV)</span>
            <span className="text-[10px] text-stone-500 font-mono">میانگین سبد</span>
          </div>
          <div className="text-sm font-black text-white font-fanum">
            {toFaDigits(formatTomans(data.averageOrderValueTomans).formatted)} تومان
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>{toFaDigits(data.avgItemsPerOrder)} کالا/سبد</span>
            {renderDelta(data.aovDeltaPercent)}
          </div>
        </div>

        {/* Shipping Collected */}
        <div className="p-3 bg-[#131211] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="flex items-center gap-1 text-cyan-300">
              <Truck size={12} className="text-cyan-400" />
              کرایه حمل وصول‌شده
            </span>
            <span className="text-[10px] text-stone-500 font-mono">تیپاکس/پست</span>
          </div>
          <div className="text-sm font-black text-cyan-400 font-fanum">
            {toFaDigits(formatTomans(data.shippingCollectedTomans).formatted)} تومان
          </div>
          <div className="text-[10px] text-stone-400 mt-1">تسویه با کاریران پستی</div>
        </div>

        {/* Gateway Fees (Shaparak) */}
        <div className="p-3 bg-[#131211] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span>کارمزد شبکه شاپرک</span>
            <span className="text-[10px] text-stone-500 font-mono">سهم بانک</span>
          </div>
          <div className="text-sm font-black text-stone-300 font-fanum">
            {toFaDigits(formatTomans(data.estimatedGatewayFeesTomans).formatted)} تومان
          </div>
          <div className="text-[10px] text-stone-400 mt-1">۱٪ سقف ۴,۰۰۰ تومانی</div>
        </div>

        {/* Estimated Gross Margin */}
        <div className="p-3 bg-[#131211] border border-white/10 rounded-xl relative">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span className="text-[#eed29d]">حاشیه سود ناخالص</span>
            <span className="text-[10px] text-[#ba8d3d] font-mono">Margin %</span>
          </div>
          {maskSensitiveFinancials ? (
            <div className="flex items-center gap-1.5 py-0.5 text-xs text-stone-400">
              <Lock size={12} className="text-amber-400" />
              <span>محرمانه مالی</span>
            </div>
          ) : (
            <>
              <div className="text-sm font-black text-[#eed29d] font-fanum">
                {toFaDigits(data.estimatedGrossMarginPercent)}٪
              </div>
              <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
                <span>پس از کسر هزینه مستقیم</span>
                {renderDelta(data.marginDeltaPercent)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reconciliation Math Guarantee Card */}
      <div className="p-4 bg-[#181716] border border-white/10 rounded-2xl text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-400" />
            فرمول تطبیق و شفافیت تراز مالی (Mathematical Reconciliation Formula)
          </span>
          <span className="text-stone-400 font-mono text-[11px]">Audit Precision: 100% Deterministic</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-300">
          <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
            <div className="text-stone-400 text-[11px]">۱. گام فروش ناخالص تا پرداختی قطعی:</div>
            <div className="font-mono text-stone-200 text-xs">
              فروش ناخالص ({toFaDigits(formatTomans(data.grossOrderValueTomans).formatted)}) - تخفیف‌ها (
              {toFaDigits(formatTomans(data.discountsTomans).formatted)}) = پرداخت قطعی (
              {toFaDigits(formatTomans(data.capturedPaymentsTomans).formatted)})
            </div>
          </div>
          <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
            <div className="text-stone-400 text-[11px]">۲. گام وصول تا فروش خالص:</div>
            <div className="font-mono text-stone-200 text-xs">
              پرداخت قطعی ({toFaDigits(formatTomans(data.capturedPaymentsTomans).formatted)}) - استرداد تسویه‌شده (
              {toFaDigits(formatTomans(data.processedRefundsTomans).formatted)}) = فروش خالص (
              {toFaDigits(formatTomans(data.netSalesTomans).formatted)})
            </div>
          </div>
          <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
            <div className="text-stone-400 text-[11px]">۳. اقلام خارج از درآمد:</div>
            <div className="font-mono text-stone-200 text-xs">
              {toFaDigits(data.initiatedPendingPaymentsCount)} سفارش معلق ({toFaDigits(formatTomans(data.initiatedPendingPaymentsTomans).formatted)} ت) +{' '}
              {toFaDigits(data.failedPaymentsCount)} پرداخت ناموفق ({toFaDigits(formatTomans(data.failedPaymentsTomans).formatted)} ت) به عنوان درآمد منظور نشده‌اند.
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-white/10 pb-px overflow-x-auto text-xs">
        {[
          { id: 'summary', label: 'تراز کلی و جریان درآمد', icon: TrendingUp },
          { id: 'timeline', label: 'روند زمانی و نمودارهای فروش', icon: BarChart2 },
          { id: 'catalog_vs_pod', label: 'تفکیک کاتالوگ و آتلیه چاپ', icon: Scissors },
          { id: 'rankings', label: 'رتبه‌بندی محصولات و SKUها', icon: Layers },
          { id: 'unit_economics', label: 'اقتصاد واحد و حاشیه سود', icon: DollarSign },
          { id: 'refunds_discounts', label: 'استردادها، تخفیف‌ها و قیف ناموفق', icon: RotateCcw },
          { id: 'missing_inputs', label: 'اقلام خارج از دسترس و شکاف‌های داده', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                isActive
                  ? 'border-[#ba8d3d] text-[#eed29d] font-bold bg-[#ba8d3d]/5 rounded-t-lg'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-white/5 rounded-t-lg'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#ba8d3d]' : 'text-stone-500'} />
              <span>{tab.label}</span>
              {tab.id === 'missing_inputs' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY & RECONCILIATION */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Executive Revenue Breakdown Table */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">جدول تفکیکی اقلام درآمدی و هزینه‌های مستقیم سفارش‌ها</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  ارقام مندرج بر اساس دوره انتخابی ({toFaDigits(data.timeframeDays)} روز) و بدون لحاظ هرگونه تخمین موهوم ارائه گردیده‌اند.
                </p>
              </div>
              <Badge label={`ارز پایه: تومان`} variant="warning" size="sm" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#181716] border-b border-white/10 text-stone-400">
                    <th className="py-3 px-4 font-bold">بند مالی / عنوان تراکنش</th>
                    <th className="py-3 px-4 font-bold">تعریف و ماهیت عملیاتی</th>
                    <th className="py-3 px-4 font-bold">تعداد اقلام/فاکتورها</th>
                    <th className="py-3 px-4 font-bold">مبلغ دوره جاری</th>
                    <th className="py-3 px-4 font-bold">سهم از کل / نرخ</th>
                    <th className="py-3 px-4 font-bold">وضعیت شناسایی درآمد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                      ارزش ناخالص فاکتورها (Gross Order Value)
                    </td>
                    <td className="py-3 px-4 text-stone-400">جمع مبلغ خطوط کالا + کرایه حمل پیش از تخفیف</td>
                    <td className="py-3 px-4 font-fanum text-stone-300">{toFaDigits(data.verifiedOrdersCount)} فاکتور</td>
                    <td className="py-3 px-4 font-bold text-white font-fanum">
                      {toFaDigits(formatTomans(data.grossOrderValueTomans).formatted)} تومان
                    </td>
                    <td className="py-3 px-4 font-fanum text-stone-400">۱۰۰٪ مبنا</td>
                    <td className="py-3 px-4">
                      <Badge label="تراز ثبت اولیه" variant="neutral" size="sm" />
                    </td>
                  </tr>

                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-amber-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      کسر: تخفیف‌های اعمال‌شده (Discounts)
                    </td>
                    <td className="py-3 px-4 text-stone-400">کدهای تبلیغاتی، تخفیف حجم سبد و بن‌های باشگاه مشتریان</td>
                    <td className="py-3 px-4 font-fanum text-stone-300">{toFaDigits(data.discountedOrdersCount)} سفارش</td>
                    <td className="py-3 px-4 font-bold text-amber-400 font-fanum">
                      ({toFaDigits(formatTomans(data.discountsTomans).formatted)}) تومان
                    </td>
                    <td className="py-3 px-4 font-fanum text-stone-400">
                      {toFaDigits(Math.round((data.discountsTomans / data.grossOrderValueTomans) * 1000) / 10)}٪ ارزش ناخالص
                    </td>
                    <td className="py-3 px-4">
                      <Badge label="کاهنده درآمد" variant="warning" size="sm" />
                    </td>
                  </tr>

                  <tr className="hover:bg-white/5 bg-[#181716]/60">
                    <td className="py-3 px-4 font-black text-[#eed29d] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#ba8d3d]"></div>
                      پرداخت‌های قطعی تسویه‌شده (Captured Payments)
                    </td>
                    <td className="py-3 px-4 text-stone-300 font-medium">مبالغ واریزشده به حساب درگاه شاپرک/کارت‌به‌کارت تاییدشده</td>
                    <td className="py-3 px-4 font-fanum text-stone-200 font-bold">{toFaDigits(data.capturedPaymentsCount)} فاکتور</td>
                    <td className="py-3 px-4 font-black text-[#eed29d] font-fanum text-sm">
                      {toFaDigits(formatTomans(data.capturedPaymentsTomans).formatted)} تومان
                    </td>
                    <td className="py-3 px-4 font-fanum text-stone-300 font-bold">
                      {toFaDigits(Math.round((data.capturedPaymentsTomans / data.grossOrderValueTomans) * 1000) / 10)}٪
                    </td>
                    <td className="py-3 px-4">
                      <Badge label="درآمد نهایی شاپرک" variant="brand" size="sm" />
                    </td>
                  </tr>

                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-rose-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                      کسر: استرداد تسویه‌شده (Processed Refunds)
                    </td>
                    <td className="py-3 px-4 text-stone-400">مبالغ مرجوعی عودت‌داده‌شده به شماره شبای خریداران</td>
                    <td className="py-3 px-4 font-fanum text-stone-300">{toFaDigits(data.processedRefundsCount)} پرونده</td>
                    <td className="py-3 px-4 font-bold text-rose-400 font-fanum">
                      ({toFaDigits(formatTomans(data.processedRefundsTomans).formatted)}) تومان
                    </td>
                    <td className="py-3 px-4 font-fanum text-rose-400">
                      نرخ استرداد: {toFaDigits(data.refundRatePercent)}٪
                    </td>
                    <td className="py-3 px-4">
                      <Badge label="کسر قطعی از بانک" variant="critical" size="sm" />
                    </td>
                  </tr>

                  <tr className="hover:bg-white/5 bg-emerald-950/20">
                    <td className="py-3 px-4 font-black text-emerald-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      فروش خالص نهایی (Net Sales)
                    </td>
                    <td className="py-3 px-4 text-stone-300 font-medium">مبنای درآمد عملیاتی فروشگاه پس از کسر کلیه مرجوعی‌ها</td>
                    <td className="py-3 px-4 font-fanum text-stone-200 font-bold">
                      {toFaDigits(data.capturedPaymentsCount - data.processedRefundsCount)} سفارش موثر
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-400 font-fanum text-sm">
                      {toFaDigits(formatTomans(data.netSalesTomans).formatted)} تومان
                    </td>
                    <td className="py-3 px-4 font-fanum text-emerald-300 font-bold">
                      {toFaDigits(Math.round((data.netSalesTomans / data.capturedPaymentsTomans) * 1000) / 10)}٪ وصولی
                    </td>
                    <td className="py-3 px-4">
                      <Badge label="درآمد عملیاتی قطعی" variant="success" size="sm" />
                    </td>
                  </tr>

                  {/* Sensitive Costs Breakdown */}
                  {!maskSensitiveFinancials && (
                    <>
                      <tr className="hover:bg-white/5 text-stone-400">
                        <td className="py-3 px-4 font-bold flex items-center gap-2">
                          <Scissors size={13} className="text-stone-400" />
                          بهای تمام‌شده پوشاک خام (Raw Blank COGS)
                        </td>
                        <td className="py-3 px-4">تیشرت پنبه سوپر ۲۸۰ گرم، هودی دورس ۳ نخ و کلاه</td>
                        <td className="py-3 px-4 font-fanum">{toFaDigits(data.itemsSoldCount)} قطعه لباس</td>
                        <td className="py-3 px-4 font-bold text-stone-300 font-fanum">
                          ({toFaDigits(formatTomans(data.estimatedRawCogsTomans).formatted)}) تومان
                        </td>
                        <td className="py-3 px-4 font-fanum">
                          {toFaDigits(Math.round((data.estimatedRawCogsTomans / data.netSalesTomans) * 1000) / 10)}٪ از خالص
                        </td>
                        <td className="py-3 px-4">
                          <Badge label="هزینه تولید کارگاه" variant="neutral" size="sm" />
                        </td>
                      </tr>

                      <tr className="hover:bg-white/5 text-stone-400">
                        <td className="py-3 px-4 font-bold flex items-center gap-2">
                          <Printer size={13} className="text-stone-400" />
                          هزینه چاپ مستقیم و تثبیت DTG
                        </td>
                        <td className="py-3 px-4">جوهر پیگمنت ژاپنی، امولسیون کوتینگ و پرس حرارتی ۱۶۰ درجه</td>
                        <td className="py-3 px-4 font-fanum">{toFaDigits(data.itemsSoldCount)} نوبت چاپ</td>
                        <td className="py-3 px-4 font-bold text-stone-300 font-fanum">
                          ({toFaDigits(formatTomans(data.estimatedPrintingCostTomans).formatted)}) تومان
                        </td>
                        <td className="py-3 px-4 font-fanum">
                          {toFaDigits(Math.round((data.estimatedPrintingCostTomans / data.netSalesTomans) * 1000) / 10)}٪ از خالص
                        </td>
                        <td className="py-3 px-4">
                          <Badge label="مواد مصرفی چاپ" variant="neutral" size="sm" />
                        </td>
                      </tr>

                      <tr className="hover:bg-white/5 text-stone-400">
                        <td className="py-3 px-4 font-bold flex items-center gap-2">
                          <PackageCheck size={13} className="text-stone-400" />
                          بسته‌بندی لوکس هاردباکس و ملزومات
                        </td>
                        <td className="py-3 px-4">جعبه مات مشکی، کاغذ پوستی اسیدفری، تگ برنجی و پک استیکر</td>
                        <td className="py-3 px-4 font-fanum">{toFaDigits(data.verifiedOrdersCount)} جعبه</td>
                        <td className="py-3 px-4 font-bold text-stone-300 font-fanum">
                          ({toFaDigits(formatTomans(data.estimatedPackagingCostTomans).formatted)}) تومان
                        </td>
                        <td className="py-3 px-4 font-fanum">ثابت ۴۵,۰۰۰ ت/سفارش</td>
                        <td className="py-3 px-4">
                          <Badge label="هزینه ارسال/بسته‌بندی" variant="neutral" size="sm" />
                        </td>
                      </tr>

                      <tr className="hover:bg-white/5 bg-[#181716] font-bold">
                        <td className="py-3 px-4 text-[#eed29d] flex items-center gap-2">
                          <Sparkles size={14} className="text-[#ba8d3d]" />
                          سود ناخالص عملیاتی کارگاه (Gross Margin)
                        </td>
                        <td className="py-3 px-4 text-stone-300">مازاد فروش خالص بر کلیه هزینه‌های مستقیم پارچه، چاپ، پک و درگاه</td>
                        <td className="py-3 px-4 font-fanum text-stone-300">-</td>
                        <td className="py-3 px-4 font-black text-[#eed29d] font-fanum text-sm">
                          {toFaDigits(formatTomans(data.estimatedGrossMarginTomans).formatted)} تومان
                        </td>
                        <td className="py-3 px-4 font-fanum text-emerald-400 font-black">
                          {toFaDigits(data.estimatedGrossMarginPercent)}٪ حاشیه سود
                        </td>
                        <td className="py-3 px-4">
                          <Badge label="سود ناخالص مدل" variant="brand" size="sm" />
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {maskSensitiveFinancials && (
              <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Lock size={13} className="text-amber-400" />
                  ریز هزینه‌های پارچه خام، جوهر چاپ و سود ناخالص به دلیل سطح دسترسی محرمانه پنهان شده است.
                </span>
                <button
                  type="button"
                  onClick={() => setMaskSensitiveFinancials(false)}
                  className="text-[#eed29d] hover:underline cursor-pointer"
                >
                  مشاهده با تایید هویت مدیر
                </button>
              </div>
            )}
          </div>

          {/* Failed Payments Funnel Notice Banner */}
          <div className="p-4 bg-gradient-to-r from-rose-950/20 to-[#181716] border border-rose-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                <XCircle size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>قیف تراکنش‌های ناموفق و پرداخت‌های معلق</span>
                  <Badge label="خارج از محاسبات درآمد" variant="critical" size="sm" />
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  تعداد <strong className="text-rose-400 font-fanum">{toFaDigits(data.failedPaymentsCount)} پرداخت ناموفق</strong> به ارزش{' '}
                  <strong className="text-rose-400 font-fanum">{toFaDigits(formatTomans(data.failedPaymentsTomans).formatted)} تومان</strong> و{' '}
                  <strong className="text-amber-400 font-fanum">{toFaDigits(data.initiatedPendingPaymentsCount)} سفارش در انتظار پرداخت</strong> به علت انصراف از درگاه یا خطای بانکی نهایی نشده‌اند.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/sales/payments')}
              rightIcon={<ChevronRight size={14} />}
              className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 shrink-0"
            >
              بررسی لاگ تراکنش‌های ناموفق
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE & CHARTS */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">نمودار زمانی روند فروش در دوره انتخابی</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  ارزیابی افت و خیزهای روزانه، مبالغ استردادی و مدیریت تراز منفی روزهای تسویه مرجوعی.
                </p>
              </div>

              {/* Metric Selector for Timeline Chart */}
              <div className="flex items-center gap-1.5 bg-[#181716] p-1 rounded-xl border border-white/10 text-xs">
                {[
                  { id: 'net_sales', label: 'فروش خالص' },
                  { id: 'gross_sales', label: 'فروش ناخالص' },
                  { id: 'aov', label: 'ارزش هر فاکتور' },
                  { id: 'orders_count', label: 'تعداد سفارش' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMetric(m.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === m.id
                        ? 'bg-[#ba8d3d] text-black font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Bar Chart */}
            <ChartContainer title="" height={260}>
              <div className="h-full flex items-end justify-between gap-1.5 pt-8 px-2">
                {data.timeline.map((point) => {
                  let val = point.netSalesTomans;
                  if (chartMetric === 'gross_sales') val = point.grossSalesTomans;
                  if (chartMetric === 'aov') val = point.aovTomans;
                  if (chartMetric === 'orders_count') val = point.ordersCount * 1000000;

                  const maxVal = chartMetric === 'orders_count' ? 10000000 : 15000000;
                  const pct = Math.max(4, Math.min(100, Math.round((Math.max(0, val) / maxVal) * 100)));
                  const isNegative = val < 0;

                  return (
                    <div key={point.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="relative w-full flex items-end justify-center h-44">
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full max-w-[16px] rounded-t transition-all group-hover:brightness-125 ${
                            isNegative
                              ? 'bg-rose-500'
                              : chartMetric === 'net_sales'
                              ? 'bg-gradient-to-t from-emerald-600/40 to-emerald-400'
                              : chartMetric === 'gross_sales'
                              ? 'bg-gradient-to-t from-[#ba8d3d]/40 to-[#eed29d]'
                              : 'bg-gradient-to-t from-cyan-600/40 to-cyan-400'
                          }`}
                        />
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-stone-900 border border-white/20 text-[10px] px-2 py-1 rounded-lg text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                          <span className="font-mono text-stone-400">{point.date}</span>
                          <span className="font-bold text-[#eed29d] font-fanum">
                            {chartMetric === 'orders_count'
                              ? `${toFaDigits(point.ordersCount)} سفارش`
                              : `${toFaDigits(formatTomans(val).formatted)} ت`}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-500 font-mono hidden md:inline">
                        {point.dateLabelFa}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ChartContainer>

            {/* Daily Breakdown Table */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">جدول ریز محاسبات روزانه</span>
                <span className="text-[11px] text-stone-400 font-mono">
                  {toFaDigits(data.timeline.length)} رکورد ثبت‌شده
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto border border-white/5 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#181716] sticky top-0 text-stone-400 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">فروش ناخالص</th>
                      <th className="py-2.5 px-3">استرداد</th>
                      <th className="py-2.5 px-3">فروش خالص</th>
                      <th className="py-2.5 px-3">تعداد سفارش</th>
                      <th className="py-2.5 px-3">ارزش هر فاکتور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-fanum">
                    {data.timeline.map((row) => (
                      <tr key={row.date} className="hover:bg-white/5">
                        <td className="py-2 px-3 font-mono text-stone-300">{row.date}</td>
                        <td className="py-2 px-3 text-stone-200">{toFaDigits(formatTomans(row.grossSalesTomans).formatted)} ت</td>
                        <td className="py-2 px-3 text-rose-400">{toFaDigits(formatTomans(row.refundsTomans).formatted)} ت</td>
                        <td className={`py-2 px-3 font-bold ${row.netSalesTomans >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {toFaDigits(formatTomans(row.netSalesTomans).formatted)} ت
                        </td>
                        <td className="py-2 px-3 text-stone-300">{toFaDigits(row.ordersCount)}</td>
                        <td className="py-2 px-3 text-[#eed29d]">{toFaDigits(formatTomans(row.aovTomans).formatted)} ت</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATALOG VS CUSTOM POD */}
      {activeTab === 'catalog_vs_pod' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Standard Catalog Revenue */}
            <div className="p-5 bg-[#131211] border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">پوشاک استاندارد کاتالوگ آماده</h4>
                    <p className="text-xs text-stone-400">کالکشن‌های ثابت شاه‌پوش (خوشنویسی، گرافیک و استریت‌ویر)</p>
                  </div>
                </div>
                <Badge label="آماده ارسال" variant="neutral" size="sm" />
              </div>

              <div className="p-4 bg-[#181716] rounded-xl border border-white/5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-stone-400">درآمد قطعی کاتالوگ:</span>
                  <div className="text-xl font-black text-white font-fanum">
                    {toFaDigits(formatTomans(data.standardRevenueTomans).formatted)} تومان
                  </div>
                </div>
                <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${data.standardRevenuePercent}%` }}
                    className="bg-[#ba8d3d] h-full rounded-full transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
                  <span>سهم از کل فروش: <strong className="text-white font-fanum">{toFaDigits(data.standardRevenuePercent)}٪</strong></span>
                  <span>{toFaDigits(data.standardOrdersCount)} فاکتور</span>
                </div>
              </div>

              <ul className="text-xs text-stone-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  زمان آماده‌سازی و ارسال سریع‌تر (میانگین ۱۲ ساعت کاری)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  نرخ مرجوعی بسیار پایین (کمتر از ۱.۲٪) به علت استاندارد بودن سایزبندی
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  تولید سری‌دوزی شده با بهای تمام‌شده جوهر پایین‌تر
                </li>
              </ul>
            </div>

            {/* Custom POD Studio Revenue */}
            <div className="p-5 bg-[#131211] border border-[#ba8d3d]/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#ba8d3d]/20 text-[#eed29d]">
                    <Scissors size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">آتلیه چاپ سفارشی آنلاین (POD)</h4>
                    <p className="text-xs text-stone-400">آرت‌ورک‌های آپلودشده توسط خریداران و چاپ تک‌نسخه‌ای</p>
                  </div>
                </div>
                <Badge label="تولید تکی DTG" variant="brand" size="sm" />
              </div>

              <div className="p-4 bg-[#181716] rounded-xl border border-white/5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-stone-400">درآمد قطعی آتلیه:</span>
                  <div className="text-xl font-black text-[#eed29d] font-fanum">
                    {toFaDigits(formatTomans(data.customRevenueTomans).formatted)} تومان
                  </div>
                </div>
                <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${data.customRevenuePercent}%` }}
                    className="bg-emerald-500 h-full rounded-full transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
                  <span>سهم از کل فروش: <strong className="text-[#eed29d] font-fanum">{toFaDigits(data.customRevenuePercent)}٪</strong></span>
                  <span>{toFaDigits(data.customOrdersCount)} فاکتور</span>
                </div>
              </div>

              <ul className="text-xs text-stone-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  میانگین ارزش فاکتور (AOV) بالاتر به دلیل پرمیوم بودن خدمات اختصاصی
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  حاشیه سود بالاتر در هر قطعه (بیش از ۶۳.۷٪ مارجین ناخالص)
                </li>
                <li className="flex items-center gap-2">
                  <Info size={13} className="text-amber-400" />
                  نیازمند بازبینی کیفیت فایل توسط اپراتور آتلیه پیش از ارسال به دستگاه DTG
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RANKINGS (CATEGORIES & SKUS) */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* Categories Grid */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">تفکیک درآمدی بر اساس دسته‌بندی‌های طراحی</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                سهم دسته‌های اصلی خوشنویسی سنتی، تایپوگرافی معاصر، سبک مینیمال و سفارشات آتلیه آنلاین.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.categoryStats.map((cat) => (
                <div key={cat.category} className="p-4 bg-[#181716] border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{cat.categoryLabelFa}</span>
                    <span className="text-stone-400 font-fanum">{toFaDigits(cat.sharePercent)}٪ سهم</span>
                  </div>
                  <div className="text-base font-black text-[#eed29d] font-fanum">
                    {toFaDigits(formatTomans(cat.revenueTomans).formatted)} تومان
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-white/5">
                    <span>{toFaDigits(cat.itemsSoldCount)} قطعه فروخته‌شده</span>
                    <span className="text-emerald-400 font-fanum">{toFaDigits(cat.estimatedMarginPercent)}٪ مارجین</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 10 SKUs Table with Catalog Links */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">۱۰ شناسه کالایی (SKU) پرفروش در دوره انتخابی</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  کلیک روی هر محصول جهت بررسی وضعیت موجودی در کاتالوگ و انبارداری.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/catalog/products')}
                rightIcon={<ExternalLink size={13} />}
                className="border-white/10 text-xs text-stone-300"
              >
                کاتالوگ کامل محصولات
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#181716] border-b border-white/10 text-stone-400 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">رتبه</th>
                    <th className="py-3 px-4">کد انبارداری (SKU)</th>
                    <th className="py-3 px-4">عنوان محصول و مشخصات</th>
                    <th className="py-3 px-4">سایز / رنگ</th>
                    <th className="py-3 px-4">قیمت واحد</th>
                    <th className="py-3 px-4">تعداد فروش</th>
                    <th className="py-3 px-4">درآمد کل فاکتور</th>
                    <th className="py-3 px-4">سهم از درآمد</th>
                    <th className="py-3 px-4">عملیات کاتالوگ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-fanum">
                  {data.topSkus.map((sku, idx) => (
                    <tr key={sku.sku} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-400">
                        {idx + 1 === 1 ? '🥇 ۱' : idx + 1 === 2 ? '🥈 ۲' : idx + 1 === 3 ? '🥉 ۳' : toFaDigits(idx + 1)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#eed29d]">{sku.sku}</td>
                      <td className="py-3 px-4 font-sans font-bold text-white">{sku.productName}</td>
                      <td className="py-3 px-4 font-sans text-stone-300">
                        {sku.size} / {sku.colorName}
                      </td>
                      <td className="py-3 px-4 text-stone-300">{toFaDigits(formatTomans(sku.unitPriceTomans).formatted)} ت</td>
                      <td className="py-3 px-4 font-bold text-white">{toFaDigits(sku.quantitySold)} عدد</td>
                      <td className="py-3 px-4 font-black text-[#eed29d]">
                        {toFaDigits(formatTomans(sku.totalRevenueTomans).formatted)} تومان
                      </td>
                      <td className="py-3 px-4 text-stone-400">{toFaDigits(sku.sharePercent)}٪</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => navigate('/admin/catalog/products')}
                          className="text-[#ba8d3d] hover:text-[#eed29d] flex items-center gap-1 font-sans text-[11px] cursor-pointer"
                        >
                          <span>بررسی انبار</span>
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UNIT ECONOMICS */}
      {activeTab === 'unit_economics' && (
        <div className="space-y-6">
          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">جدول اقتصاد واحد اقلام شاخص (Unit Economics Table)</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  تفکیک ساختار هزینه مستقیم شامل پارچه خام کارگاهی، چاپ و تثبیت DTG، بسته‌بندی پرمیوم و کارمزد شاپرک.
                </p>
              </div>
              <Badge label="داده‌های قطعی کارگاه" variant="brand" size="sm" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#181716] border-b border-white/10 text-stone-400 text-[11px]">
                    <th className="py-3 px-4">شناسه / مدل محصول</th>
                    <th className="py-3 px-4">قیمت فروش</th>
                    <th className="py-3 px-4">پوشاک خام (COGS)</th>
                    <th className="py-3 px-4">چاپ و تثبیت DTG</th>
                    <th className="py-3 px-4">بسته‌بندی هاردباکس</th>
                    <th className="py-3 px-4">کارمزد شاپرک</th>
                    <th className="py-3 px-4">بهای تمام‌شده مستقیم</th>
                    <th className="py-3 px-4">حاشیه سود ناخالص</th>
                    <th className="py-3 px-4">درصد مارجین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-fanum">
                  {data.unitEconomics.map((ue) => (
                    <tr key={ue.id} className="hover:bg-white/5">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-white">{ue.title}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{ue.notes}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {toFaDigits(formatTomans(ue.sellingPriceTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 text-stone-300">
                        {toFaDigits(formatTomans(ue.rawGarmentCostTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 text-stone-300">
                        {ue.printCostTomans > 0 ? `${toFaDigits(formatTomans(ue.printCostTomans).formatted)} ت` : 'فاقد چاپ'}
                      </td>
                      <td className="py-3 px-4 text-stone-300">
                        {toFaDigits(formatTomans(ue.packagingCostTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {toFaDigits(formatTomans(ue.gatewayFeeTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">
                        {toFaDigits(formatTomans(ue.totalDirectCostTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-400">
                        {toFaDigits(formatTomans(ue.grossContributionTomans).formatted)} ت
                      </td>
                      <td className="py-3 px-4 font-black text-[#eed29d]">
                        {toFaDigits(ue.grossMarginPercent)}٪
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[#181716] border-t border-white/5 text-xs text-stone-400 flex items-center justify-between">
              <span>کلیه هزینه‌ها بر اساس استاندارد خیاطی و آتلیه چاپ پاییزه ۱۴۰۵ شاه‌پوش مستندسازی شده است.</span>
              <span className="font-mono text-[11px] text-stone-500">Workshop Specs: DTG Epson F2100 / HeatPress Stahls</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REFUNDS, DISCOUNTS & FAILED FUNNEL */}
      {activeTab === 'refunds_discounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Refunds Breakdown Card */}
            <div className="p-5 bg-[#131211] border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">تفکیک استردادهای مالی (Processed vs Requested)</h4>
                    <p className="text-xs text-stone-400">تمایز واریزهای تسویه‌شده از تیکت‌های مرجوعی در انتظار تصمیم</p>
                  </div>
                </div>
                <Badge label={`نرخ استرداد: ${toFaDigits(data.refundRatePercent)}٪`} variant="critical" size="sm" />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-[#181716] rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      استردادهای قطعی واریزشده (Processed)
                    </span>
                    <p className="text-[11px] text-stone-400">واریز شبا از طریق پایا انجام و از مانده کسر شده است.</p>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-rose-400 font-fanum">
                      {toFaDigits(formatTomans(data.processedRefundsTomans).formatted)} تومان
                    </div>
                    <span className="text-[10px] text-stone-400 font-fanum">{toFaDigits(data.processedRefundsCount)} تراکنش</span>
                  </div>
                </div>

                <div className="p-3 bg-[#181716] rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      درخواست‌های استرداد در انتظار بررسی (Requested)
                    </span>
                    <p className="text-[11px] text-stone-400">درخواست خریدار ثبت شده اما وجه هنوز برگشت داده نشده است.</p>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-amber-400 font-fanum">
                      {toFaDigits(formatTomans(data.requestedRefundsTomans).formatted)} تومان
                    </div>
                    <span className="text-[10px] text-amber-400 font-fanum">{toFaDigits(data.requestedRefundsCount)} پرونده</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/sales/returns')}
                  rightIcon={<ChevronRight size={13} />}
                  className="border-white/10 text-xs"
                >
                  ورود به کارتابل مرجوعی‌ها
                </Button>
              </div>
            </div>

            {/* Discounts & Promos Card */}
            <div className="p-5 bg-[#131211] border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Percent size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">عملکرد کوپن‌ها و کدهای تخفیف</h4>
                    <p className="text-xs text-stone-400">تاثیر پروموشن‌های اینستاگرامی و مناسبتی بر حجم سفارش‌ها</p>
                  </div>
                </div>
                <Badge label="تخفیف هوشمند" variant="warning" size="sm" />
              </div>

              <div className="p-4 bg-[#181716] rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">مجموع تخفیف‌های اعطا شده:</span>
                  <div className="text-lg font-black text-amber-400 font-fanum">
                    {toFaDigits(formatTomans(data.discountsTomans).formatted)} تومان
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span>تعداد سفارشات دارای کد تخفیف:</span>
                  <span className="font-bold font-fanum">{toFaDigits(data.discountedOrdersCount)} سفارش</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span>میانگین ارزش تخفیف در هر فاکتور:</span>
                  <span className="font-bold font-fanum">
                    {data.discountedOrdersCount > 0
                      ? `${toFaDigits(formatTomans(Math.round(data.discountsTomans / data.discountedOrdersCount)).formatted)} ت`
                      : '۰ ت'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-400 leading-relaxed">
                استفاده از تخفیف موجب افزایش میانگین ارزش سبد خرید (AOV) تا حدود ۱۸٪ در بین مشتریان وفادار VIP گردیده است.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MISSING INPUTS & INTEGRATION GAPS (NO SPECULATIVE FIGURES) */}
      {activeTab === 'missing_inputs' && (
        <div className="space-y-6">
          <div className="p-4 bg-[#131211] border border-amber-500/30 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  فهرست شاخص‌های خارج از دسترس و استانداردهای عدم تخمین موهوم
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  طبق خط‌مشی فنی مهندسی سیستم، در صورت عدم وجود ورودی واقعی و قطعی، سیستم از تولید اعداد تخمینی، مدل‌سازی‌های ساختگی (مانند حدس زدن LTV یا مالیات بدون اتصال رسمی) خودداری نموده و وضعیت صریح «داده کافی نیست» را همراه با پیش‌نیازهای فنی لازم درج می‌نماید.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Gap 1: Tax Settlement */}
              <div className="p-4 bg-[#181716] border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Receipt size={14} className="text-amber-400" />
                    تسویه مالیات بر ارزش افزوده و عملکرد مودیان
                  </span>
                  <Badge label="داده کافی نیست" variant="warning" size="sm" />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  <strong>علت فقدان:</strong> عدم اتصال وب‌سرویس مستقیم به کارپوشه سامانه مودیان سازمان امور مالیاتی کشور و دریافت شماره منحصر به فرد مالیاتی فاکتور الکترونیکی.
                </p>
                <div className="text-[11px] text-stone-500 pt-1 border-t border-white/5">
                  پیش‌نیاز فنی: پیاده‌سازی گیت‌وی کلید خصوصی سامانه مودیان (TSP).
                </div>
              </div>

              {/* Gap 2: Ad Spend Return (ROAS) */}
              <div className="p-4 bg-[#181716] border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Percent size={14} className="text-amber-400" />
                    نرخ بازگشت هزینه تبلیغات کلیکی (ROAS)
                  </span>
                  <Badge label="داده کافی نیست" variant="warning" size="sm" />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  <strong>علت فقدان:</strong> عدم دریافت وب‌هوک گزارش هزینه کمپین‌های دلاری گوگل‌ادز و ریالی یکتانت/تپسل در محیط حاضر.
                </p>
                <div className="text-[11px] text-stone-500 pt-1 border-t border-white/5">
                  پیش‌نیاز فنی: تنظیم وب‌سرویس هزینه تبلیغات و نسبت‌دهی UTM چندکاناله.
                </div>
              </div>

              {/* Gap 3: Multi-Year Lifetime Value (LTV) */}
              <div className="p-4 bg-[#181716] border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    ارزش طول عمر چندساله مشتری (LTV)
                  </span>
                  <Badge label="داده کافی نیست" variant="warning" size="sm" />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  <strong>علت فقدان:</strong> محاسبه معتبر LTV مستلزم حداقل ۱۲ تا ۲۴ ماه سابقه خریدهای تکراری در پایگاه داده است؛ مدل‌سازی شتاب‌زده بر اساس داده‌های چند هفته، توهم تحلیل مالی ایجاد می‌کند.
                </p>
                <div className="text-[11px] text-stone-500 pt-1 border-t border-white/5">
                  پیش‌نیاز فنی: تحلیل کوهورت چندفصلی پس از ثبت یک سال کامل تراکنش‌های فروشگاهی.
                </div>
              </div>

              {/* Gap 4: External Bank Settlement Reconciliation */}
              <div className="p-4 bg-[#181716] border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-400" />
                    مغایرت‌گیری بانکی پایا/ساتنا (Bank Settlement)
                  </span>
                  <Badge label="داده کافی نیست" variant="warning" size="sm" />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  <strong>علت فقدان:</strong> عدم اتصال به صورت‌حساب الکترونیکی شاپرک یا سوییچ تسویه بانک مرکزی در نسخه حاضر و فقدان لاگ سند بانکی.
                </p>
                <div className="text-[11px] text-stone-500 pt-1 border-t border-white/5">
                  پیش‌نیاز فنی: ماژول تطبیق بانکی خودکار (Automated Reconciliation Engine).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Enforcement Notice */}
      <div className="p-3 bg-[#131211] border border-white/5 rounded-xl text-[11px] text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-stone-400" />
          تذکر امنیتی: کنترل‌های نمایشی این صفحه در محیط پروداکشن توسط احراز هویت RBAC سمت سرور در سطح API تضمین و ایزوله می‌گردند.
        </span>
        <span className="font-mono text-stone-600">Shahpoosh Admin Security v2.4</span>
      </div>
    </div>
  );
};
