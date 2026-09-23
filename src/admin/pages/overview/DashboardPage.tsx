import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Printer,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  Eye,
  MousePointerClick,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Package,
  CreditCard,
  Truck,
  Activity,
  Zap,
  UserCheck,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { KPICard, Table, Badge, Button, MoneyDisplay } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { DateRangePreset } from '../../components/ui/DateRangeSelector';
import { toFaDigits } from '../../utils/formatters';
import { OrderInspectionDrawer } from '../../components/orders/OrderInspectionDrawer';
import { ActionQueueItem } from '../../domain/types';

export const DashboardPage: React.FC = () => {
  const { navigate } = useAdminRouter();
  const {
    state,
    getDashboardKPIs,
    getActionQueue,
    approveCustomDesign,
    updateVariantStock,
    completeStaffTask,
    updateOrderStatus,
  } = useAdminRepository();

  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'gross' | 'net'>('gross');
  const [trafficMetric, setTrafficMetric] = useState<'sessions' | 'visitors'>('sessions');

  // KPI Calculations derived from deterministic state
  const kpis = useMemo(() => getDashboardKPIs(dateRange), [getDashboardKPIs, dateRange]);
  const actionQueue = useMemo(() => getActionQueue(), [getActionQueue]);

  // Derived urgent items for the top visual hierarchy (first on mobile & desktop)
  const topCriticalActions = useMemo(() => {
    return actionQueue.slice(0, 4);
  }, [actionQueue]);

  // Short Lists
  const recentOrders = useMemo(() => {
    return [...state.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [state.orders]);

  const newCustomDesigns = useMemo(() => {
    return [...state.customDesigns]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 4);
  }, [state.customDesigns]);

  const recentPayments = useMemo(() => {
    return [...state.payments]
      .filter((p) => p.status === 'verified_paid')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [state.payments]);

  const criticalVariantsList = useMemo(() => {
    return state.variants
      .filter((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold)
      .slice(0, 4);
  }, [state.variants]);

  // Timeframe label in Persian
  const timeframeLabel = useMemo(() => {
    switch (dateRange) {
      case 'today':
        return 'امروز (۲ مهر ۱۴۰۵)';
      case '7d':
        return '۷ روز گذشته';
      case '30d':
        return '۳۰ روز گذشته';
      case '90d':
        return '۹۰ روز گذشته (فصلی)';
      default:
        return '۳۰ روز گذشته';
    }
  }, [dateRange]);

  // Chart Calculations (100% reconciled to daily snapshots)
  const maxRevenueInChart = useMemo(() => {
    if (!kpis.chartSnapshots.length) return 1;
    const maxVal = Math.max(...kpis.chartSnapshots.map((s) => (chartMetric === 'gross' ? s.grossSalesTomans : s.netSalesTomans)));
    return maxVal > 0 ? maxVal : 1;
  }, [kpis.chartSnapshots, chartMetric]);

  const maxTrafficInChart = useMemo(() => {
    if (!kpis.chartSnapshots.length) return 1;
    const maxVal = Math.max(...kpis.chartSnapshots.map((s) => (trafficMetric === 'sessions' ? s.sessions : s.visitors)));
    return maxVal > 0 ? maxVal : 1;
  }, [kpis.chartSnapshots, trafficMetric]);

  // Direct quick action handler for critical items
  const handleQuickResolve = (item: ActionQueueItem) => {
    const currentStaff = state.staff[0]; // Keivan Dadgar (Super Admin)
    if (item.directActionType === 'approve_design') {
      approveCustomDesign(item.linkedEntityId, currentStaff.id, 'تایید سریع از داشبورد');
    } else if (item.directActionType === 'restock_variant') {
      const v = state.variants.find((v) => v.sku === item.linkedEntityId);
      if (v) {
        updateVariantStock(v.sku, v.onHandStock + 20, currentStaff.id, 'شارژ سریع اضطراری از داشبورد');
      }
    } else if (item.directActionType === 'advance_order') {
      updateOrderStatus(item.linkedEntityId, 'in_production', currentStaff.id, 'انتقال سریع به خط تولید');
    } else if (item.directActionType === 'complete_task') {
      completeStaffTask(item.linkedEntityId, currentStaff.id);
    } else {
      navigate(item.targetRoute);
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* 0. Header with Timeframe Tabs and Action Center Link */}
      <AdminPageHeader
        title="داشبورد عملیات و مرکز فرماندهی کارگاه"
        description="پایش بلادرنگ عملکرد فروش، هماهنگی خطوط چاپ دیجیتال DTG و نظارت بر ناوردایی‌های انبار"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe Presets */}
            <div className="flex items-center gap-1 bg-[#131211] p-1 rounded-xl border border-white/10">
              {(['today', '7d', '30d', '90d'] as DateRangePreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDateRange(preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer font-medium ${
                    dateRange === preset
                      ? 'bg-[#ba8d3d] text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {preset === 'today'
                    ? 'امروز'
                    : preset === '7d'
                    ? '۷ روزه'
                    : preset === '30d'
                    ? '۳۰ روزه'
                    : '۹۰ روزه'}
                </button>
              ))}
            </div>

            {/* Action Center Link with Badge */}
            <Button
              variant="brass"
              size="sm"
              onClick={() => navigate('/admin/overview/action-center')}
              className="flex items-center gap-2"
            >
              <Zap size={14} className="fill-stone-950" />
              <span>مرکز اقدام فوری</span>
              {actionQueue.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-fanum font-bold px-1.5 py-0.2 rounded-full mr-1">
                  {toFaDigits(actionQueue.length)}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* 1. TOP VISUAL HIERARCHY: Critical Actions (Exposed First on Mobile & Desktop) */}
      <section aria-labelledby="critical-actions-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h2 id="critical-actions-heading" className="text-sm font-bold text-white flex items-center gap-2">
              اقدامات فوری و گلوگاه‌های عملیاتی
            </h2>
            <span className="text-[11px] text-stone-400 font-fanum">
              ({toFaDigits(actionQueue.length)} مورد نیازمند مداخله کارگاهی)
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/overview/action-center')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 cursor-pointer font-medium"
          >
            مشاهده صف کامل مرکز اقدام <ChevronLeft size={14} />
          </button>
        </div>

        {topCriticalActions.length === 0 ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">تمامی فرایندهای کارگاه در وضعیت پایدار هستند</div>
                <div className="text-[11px] text-emerald-300/80 mt-0.5">
                  هیچ طرح معوق، کسری انبار بحرانی یا خطای تراکنش حل‌نشده‌ای در سیستم وجود ندارد.
                </div>
              </div>
            </div>
            <Badge label="پایدار و تاییدشده" variant="success" size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {topCriticalActions.map((item) => {
              const isCritical = item.severity === 'critical';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-[#131211] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-fanum ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isCritical ? 'بحرانی' : 'اولویت بالا'} · {item.ageText}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{item.linkedEntityId}</span>
                    </div>

                    <h3 className="text-xs font-bold text-white line-clamp-1 mb-1">{item.title}</h3>
                    <p className="text-[11px] text-stone-300 line-clamp-2 leading-relaxed mb-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <Button
                      variant={isCritical ? 'brass' : 'secondary'}
                      size="sm"
                      className="flex-1 text-[11px] py-1 h-auto"
                      onClick={() => handleQuickResolve(item)}
                    >
                      {item.primaryActionLabel}
                    </Button>
                    <button
                      type="button"
                      onClick={() => navigate(item.targetRoute)}
                      className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="مشاهده جزییات در ماژول مربوطه"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. PAID SALES & REVENUE (with Standard vs Custom Breakdown) */}
      <section aria-labelledby="sales-revenue-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="sales-revenue-heading" className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#ba8d3d]" />
              عملکرد فروش و تسویه شاپرک
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              مبنای محاسبه: تراکنش‌های قطعی درگاه بانکی در بازه {timeframeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/sales/analytics')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
          >
            گزارش تحلیلی فروش <ChevronLeft size={14} />
          </button>
        </div>

        {/* Sales KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="فروش ناخالص تاییدشده"
            value={kpis.grossSalesTomans}
            unit="تومان"
            definition="مجموع مبالغ کل فاکتورهای دارای تراکنش معتبر و قطعی شاپرک طی دوره انتخابی"
            timeframe={timeframeLabel}
            changePercent={kpis.grossDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="تراکنش شاپرک"
            icon={<TrendingUp size={18} />}
          />

          <KPICard
            title="فروش خالص کارگاه"
            value={kpis.netSalesTomans}
            unit="تومان"
            definition="مبلغ فروش ناخالص پس از کسر کسورات و مبالغ استرداد شده به مشتریان"
            timeframe={timeframeLabel}
            changePercent={kpis.netDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="خالص دریافتی"
            icon={<ShieldCheck size={18} />}
          />

          <KPICard
            title="میانگین ارزش فاکتور (AOV)"
            value={kpis.averageOrderValueTomans}
            unit="تومان"
            definition="متوسط مبلغ پرداختی هر سفارش قطعی در سبد خرید مشتریان"
            timeframe={timeframeLabel}
            changePercent={kpis.aovDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="شاخص سبد"
            icon={<ShoppingBag size={18} />}
          />

          {/* Standard vs Custom Breakdown Mini Card */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/15 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs md:text-sm font-semibold text-gray-200">سهم درآمد بر اساس نوع سفارش</span>
                <Layers size={16} className="text-[#eed29d]" />
              </div>
              <span className="text-[11px] text-gray-400 block">{timeframeLabel}</span>

              {/* Progress split bar */}
              <div className="mt-4 mb-3">
                <div className="h-3 w-full bg-stone-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${kpis.customRevenuePercent}%` }}
                    className="bg-gradient-to-r from-amber-500 to-[#ba8d3d] h-full transition-all"
                    title={`چاپ سفارشی: ${kpis.customRevenuePercent}%`}
                  />
                  <div
                    style={{ width: `${kpis.standardRevenuePercent}%` }}
                    className="bg-stone-600 h-full transition-all"
                    title={`پوشاک آماده: ${kpis.standardRevenuePercent}%`}
                  />
                </div>
              </div>

              {/* Legend numbers */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ba8d3d]"></span>
                    چاپ سفارشی آتلیه:
                  </span>
                  <span className="font-fanum font-bold text-white">
                    {toFaDigits(kpis.customRevenuePercent)}٪ ({toFaDigits(Math.round(kpis.customRevenueTomans / 1000000))} م.ت)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-500"></span>
                    پوشاک آماده کاتالوگ:
                  </span>
                  <span className="font-fanum font-bold text-white">
                    {toFaDigits(kpis.standardRevenuePercent)}٪ ({toFaDigits(Math.round(kpis.standardRevenueTomans / 1000000))} م.ت)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-white/5 text-[10px] text-stone-400 flex items-center justify-between">
              <span>مجموع سفارشات سفارشی:</span>
              <span className="font-fanum font-bold text-stone-200">
                {toFaDigits(state.orders.filter((o) => o.hasCustomLineItem).length)} سفارش
              </span>
            </div>
          </div>
        </div>

        {/* Reconciled Revenue Trend Chart */}
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">روند فروش روزانه و تسویه‌های بانکی</h3>
                <span className="text-[10px] bg-white/5 text-stone-400 px-2 py-0.5 rounded font-mono">
                  تطبیق ۱۰۰٪ با ریزفاکتورها
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                مجموع مقادیر این نمودار دقیقاً برابر با {toFaDigits(kpis.grossSalesTomans.toLocaleString())} تومان است.
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('gross')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  chartMetric === 'gross' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                فروش ناخالص
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('net')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  chartMetric === 'net' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                فروش خالص
              </button>
            </div>
          </div>

          {/* SVG/Bar Chart */}
          <div className="h-48 w-full flex items-end justify-between gap-1 sm:gap-2 pt-4 px-1" dir="ltr">
            {kpis.chartSnapshots.map((snapshot) => {
              const val = chartMetric === 'gross' ? snapshot.grossSalesTomans : snapshot.netSalesTomans;
              const heightPercent = Math.max(8, Math.min(100, Math.round((val / maxRevenueInChart) * 100)));
              const dateSlice = snapshot.date.slice(5); // MM-DD

              return (
                <div key={snapshot.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-stone-900 border border-white/20 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none" dir="rtl">
                    <span className="text-stone-300 font-mono">{snapshot.date}</span>
                    <span className="font-bold text-[#eed29d] font-fanum">
                      {toFaDigits(val.toLocaleString())} تومان
                    </span>
                    <span className="text-[9px] text-stone-400 font-fanum">
                      ({toFaDigits(snapshot.ordersCount)} سفارش)
                    </span>
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[28px] rounded-t bg-gradient-to-t from-[#ba8d3d]/40 via-[#ba8d3d]/80 to-[#eed29d] group-hover:brightness-125 transition-all shadow-sm"
                  />

                  {/* Date Label */}
                  <span className="text-[9px] text-stone-400 font-mono group-hover:text-white transition-colors">
                    {dateSlice}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. ORDERS & FULFILLMENT OPERATIONS */}
      <section aria-labelledby="orders-fulfillment-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="orders-fulfillment-heading" className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#ba8d3d]" />
              عملیات سفارش‌ها و لجستیک توزیع
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">وضعیت بسته‌بندی، رهگیری بارنامه‌ها و تحویل پستی</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/sales/orders')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
          >
            مشاهده تمام سفارش‌ها <ChevronLeft size={14} />
          </button>
        </div>

        {/* Orders KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="کل سفارش‌های دریافتی"
            value={kpis.ordersCount}
            unit="سفارش"
            definition="تعداد کل سفارش‌های ثبت‌شده در سامانه طی دوره انتخابی"
            timeframe={timeframeLabel}
            changePercent={kpis.ordersDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="داده پایگاه"
            icon={<ShoppingBag size={18} />}
          />

          <KPICard
            title="سفارش‌های تسویه‌شده قطعی"
            value={kpis.verifiedPaidOrdersCount}
            unit="سفارش"
            definition="سفارشاتی که تاییدیه واریز شاپرک را با موفقیت دریافت کرده‌اند"
            timeframe={timeframeLabel}
            sourceMode="شاپرک تاییدشده"
            icon={<CheckCircle2 size={18} />}
          />

          <KPICard
            title="سفارش‌های در خط تولید و کنترل کیفیت"
            value={kpis.activeOrdersCount}
            unit="سفارش"
            definition="سفارش‌های جاری که در مراحل چاپ، تثبیت حرارتی یا بازرسی کیفی قرار دارند"
            timeframe="وضعیت فعلی کارگاه"
            sourceMode="خط تولید فعال"
            icon={<Printer size={18} />}
          />

          <KPICard
            title="استثنائات و برگشتی‌های مرسولات"
            value={kpis.fulfillmentExceptionsCount}
            unit="مرسوله"
            definition="بسته‌هایی که به علت نقص آدرس یا عدم حضور مشتری به کارگاه بازگردانده شده‌اند"
            timeframe="وضعیت فعلی لجستیک"
            sourceMode="تیپاکس / پست"
            icon={<Truck size={18} />}
          />
        </div>

        {/* Short List: Recent Orders with Quick Drawer Inspection */}
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">آخرین سفارشات دریافتی</h3>
            <span className="text-xs text-stone-400">کلیک روی هر سطر جهت بازرسی تفصیلی سفارش</span>
          </div>

          <div className="divide-y divide-white/5">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 px-3 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ba8d3d]/15 text-[#eed29d] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    {order.id.slice(-4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{order.customerName}</span>
                      {order.hasCustomLineItem && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-sans">
                          چاپ سفارشی
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {order.city} · {toFaDigits(order.items.length)} قلم کالا · {order.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge
                    label={
                      order.status === 'in_production'
                        ? 'خط چاپ'
                        : order.status === 'paid_processing'
                        ? 'تاییدشده'
                        : order.status === 'ready_to_ship'
                        ? 'آماده ارسال'
                        : order.status === 'shipped'
                        ? 'ارسال‌شده'
                        : order.status === 'delivered'
                        ? 'تحویل‌شده'
                        : order.status === 'refunded'
                        ? 'استردادشده'
                        : 'معلق'
                    }
                    variant={
                      order.status === 'in_production'
                        ? 'warning'
                        : order.status === 'paid_processing'
                        ? 'default'
                        : order.status === 'shipped' || order.status === 'delivered'
                        ? 'success'
                        : order.status === 'refunded'
                        ? 'critical'
                        : 'default'
                    }
                    size="sm"
                  />

                  <div className="text-left font-bold text-stone-200 text-xs font-fanum">
                    {toFaDigits(order.totalTomans.toLocaleString())} تومان
                  </div>

                  <ChevronLeft size={16} className="text-stone-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VISITORS, TRAFFIC & CONVERSION RATE */}
      <section aria-labelledby="traffic-conversion-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="traffic-conversion-heading" className="text-base font-bold text-white flex items-center gap-2">
              <Eye size={18} className="text-[#ba8d3d]" />
              ترافیک، نشست‌ها و نرخ تبدیل
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              آمار تعامل بازدیدکنندگان با ویترین فروشگاه در بازه {timeframeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/analytics/traffic')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
          >
            جزییات تحلیل ترافیک <ChevronLeft size={14} />
          </button>
        </div>

        {/* Traffic KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="بازدیدکنندگان یکتا"
            value={kpis.traffic.visitors}
            unit="کاربر"
            definition="تعداد کاربران متمایز شناسایی‌شده بر اساس کوکی نشست و شناسه مرورگر"
            timeframe={timeframeLabel}
            changePercent={kpis.traffic.visitorsDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="نشست مرورگر"
            icon={<Users size={18} />}
          />

          <KPICard
            title="نشست‌های فعال تعاملی"
            value={kpis.traffic.sessions}
            unit="نشست"
            definition="مجموع جلسات بازدید دارای تعامل بیش از ۳۰ ثانیه در فروشگاه"
            timeframe={timeframeLabel}
            changePercent={kpis.traffic.sessionsDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="Session Analytics"
            icon={<MousePointerClick size={18} />}
          />

          <KPICard
            title="نرخ تبدیل سفارش به نشست"
            value={`${toFaDigits(kpis.traffic.conversionRatePercent)}٪`}
            definition="نسبت سفارش‌های موفق و تسویه‌شده شاپرک به کل نشست‌های ثبت‌شده"
            timeframe={timeframeLabel}
            changePercent={kpis.traffic.conversionDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="نرخ تبدیل"
            icon={<Activity size={18} />}
          />

          <KPICard
            title="خریداران جدید در این بازه"
            value={kpis.newCustomersCount}
            unit="مشتری جدید"
            definition="تعداد خریدارانی که نخستین بار در بازه انتخابی سفارش ثبت نموده‌اند"
            timeframe={timeframeLabel}
            changePercent={kpis.newCustomersDeltaPercent}
            trendText="نسبت به دوره قبل"
            sourceMode="ثبت نخستین خرید"
            icon={<UserCheck size={18} />}
          />
        </div>

        {/* Traffic Chart */}
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">نمودار حجم نشست‌ها و بازدید روزانه</h3>
              <p className="text-xs text-stone-400 mt-1">
                مقایسه روند تعامل کاربران با روزهای هفته و تطبیق با قله‌های ثبت فاکتور
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setTrafficMetric('sessions')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  trafficMetric === 'sessions' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                نشست‌ها (Sessions)
              </button>
              <button
                type="button"
                onClick={() => setTrafficMetric('visitors')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  trafficMetric === 'visitors' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                بازدیدکنندگان (Visitors)
              </button>
            </div>
          </div>

          <div className="h-44 w-full flex items-end justify-between gap-1 sm:gap-2 pt-4 px-1" dir="ltr">
            {kpis.chartSnapshots.map((snapshot) => {
              const val = trafficMetric === 'sessions' ? snapshot.sessions : snapshot.visitors;
              const heightPercent = Math.max(10, Math.min(100, Math.round((val / maxTrafficInChart) * 100)));
              const dateSlice = snapshot.date.slice(5);

              return (
                <div key={snapshot.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-stone-900 border border-white/20 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none" dir="rtl">
                    <span className="text-stone-300 font-mono">{snapshot.date}</span>
                    <span className="font-bold text-white font-fanum">{toFaDigits(val.toLocaleString())} {trafficMetric === 'sessions' ? 'نشست' : 'کاربر'}</span>
                  </div>

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[24px] rounded-t bg-gradient-to-t from-blue-600/40 via-blue-500/70 to-blue-400 group-hover:brightness-125 transition-all shadow-sm"
                  />

                  <span className="text-[9px] text-stone-400 font-mono group-hover:text-white transition-colors">
                    {dateSlice}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. CUSTOM DESIGN STUDIO & DTG PRODUCTION LINE */}
      <section aria-labelledby="custom-studio-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="custom-studio-heading" className="text-base font-bold text-white flex items-center gap-2">
              <Printer size={18} className="text-[#ba8d3d]" />
              آتلیه طراحی اختصاصی و خط چاپ دیجیتال DTG
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              بررسی فایل‌های ارسالی کاربران، تفکیک رنگی CMYK و آماده‌سازی جهت پرینتر Brother GTX
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/custom-studio/approval')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
          >
            ورود به میز داوری آتلیه <ChevronLeft size={14} />
          </button>
        </div>

        {/* Studio KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="طرح‌های در انتظار داوری آتلیه"
            value={kpis.designsAwaitingReview}
            unit="فایل آرت‌ورک"
            definition="طرح‌های آپلودشده نیازمند بررسی رزولوشن ۳۰۰ دی‌پی‌آی و عدم خروج از حاشیه امن چاپ"
            timeframe="وضعیت فعلی آتلیه"
            changePercent={undefined}
            sourceMode="صف داوری"
            icon={<FileCheck size={18} />}
          />

          <KPICard
            title="جاب‌های فعال روی پرینتر DTG"
            value={state.productionJobs.filter((j) => j.stage === 'printing_dtg').length}
            unit="پروژه چاپ"
            definition="سفارشاتی که در حال حاضر بر روی دستگاه پرینتر دیجیتال در حال پاشش رنگ هستند"
            timeframe="وضعیت جاری دستگاه"
            sourceMode="Brother GTX Pro"
            icon={<Printer size={18} />}
          />

          <KPICard
            title="موارد تاخیر یا تجدید چاپ"
            value={kpis.productionOverdueCount}
            unit="جاب دارای تاخیر"
            definition="سفارشاتی که به دلیل رد در کنترل کیفیت یا خطای نازل نیازمند چاپ دوباره شده‌اند"
            timeframe="کنترل خطای تولید"
            sourceMode="QC Exceptions"
            icon={<AlertTriangle size={18} />}
          />

          <KPICard
            title="نرخ تایید کیفی چاپ (QC)"
            value="۹۸.۴٪"
            definition="درصد تیشرت‌ها و هودی‌های چاپ‌شده که بدون ایراد تست شستشو و پخت را پاس کرده‌اند"
            timeframe="میانگین ۳۰ روزه"
            sourceMode="تثبیت حرارتی"
            icon={<CheckCircle2 size={18} />}
          />
        </div>

        {/* Short List 2: New Custom Designs */}
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">جدیدترین طرح‌های سفارشی ارسالی</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/custom-studio/approval')}
              className="text-xs text-[#eed29d] hover:text-[#ba8d3d]"
            >
              مشاهده در میز کار داوری ←
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {newCustomDesigns.map((design) => (
              <div
                key={design.id}
                onClick={() => navigate('/admin/custom-studio/approval')}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-lg bg-black border border-white/10 overflow-hidden mb-2.5 flex items-center justify-center">
                    <img
                      src={design.previewUrl}
                      alt={design.title}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-1.5 right-1.5">
                      <Badge
                        label={design.status === 'under_review' ? 'نیازمند داوری' : design.status === 'approved' ? 'تاییدشده' : 'ردشده'}
                        variant={design.status === 'under_review' ? 'warning' : design.status === 'approved' ? 'success' : 'critical'}
                        size="sm"
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">{design.title}</h4>
                  <div className="text-[10px] text-stone-400 mt-1 font-mono">
                    {design.id} · سفارش: {design.orderId}
                  </div>
                  <div className="text-[10px] text-stone-300 mt-0.5">
                    ابعاد: {design.dimensionsMm} · {design.resolutionDpi} DPI ({design.format})
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#eed29d]">
                  <span>بازبینی و صدور مجوز</span>
                  <ChevronLeft size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CATALOG, SKU INVENTORY & RISK INDICATORS */}
      <section aria-labelledby="catalog-inventory-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="catalog-inventory-heading" className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#ba8d3d]" />
              کاتالوگ، موجودی انبار و تراکنش‌های بانکی
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              تطبیق فیزیکی انبار با موجودی رزرو شده در سفارشات و پایش تراکنش‌های شاپرک
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/catalog/inventory')}
            className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
          >
            انبارگردانی جامع <ChevronLeft size={14} />
          </button>
        </div>

        {/* Catalog & Stock Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-200">محصولات فعال در برابر کل کاتالوگ</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-fanum text-white">
                {toFaDigits(kpis.catalog.activeProductsCount)}
              </span>
              <span className="text-xs text-stone-400 font-sans">
                از {toFaDigits(kpis.catalog.productCount)} محصول عرضه شده
              </span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400 flex items-center justify-between">
              <span>تعداد کل کدهای تنوع انبار:</span>
              <span className="font-fanum font-bold text-stone-200">{toFaDigits(kpis.catalog.variantSkuCount)} SKU</span>
            </div>
          </div>

          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-200">واحدهای فیزیکی کل و آزاد قابل فروش</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-fanum text-white">
                {toFaDigits(kpis.catalog.availableUnitsToSell.toLocaleString())}
              </span>
              <span className="text-xs text-stone-400 font-sans">
                واحد آزاد (از {toFaDigits(kpis.catalog.totalUnitsOnHand.toLocaleString())} موجودی کل)
              </span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400 flex items-center justify-between">
              <span>رزرو شده در سفارشات جاری:</span>
              <span className="font-fanum font-bold text-amber-400">{toFaDigits(kpis.catalog.reservedUnitsCount)} عدد</span>
            </div>
          </div>

          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200">هشدارهای کسری انبار</span>
              <AlertTriangle size={16} className="text-rose-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-fanum text-rose-400">
                {toFaDigits(kpis.lowStockSkusCount)}
              </span>
              <span className="text-xs text-stone-400 font-sans">کد تنوع (SKU) در مرز اتمام</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400 flex items-center justify-between">
              <span>آستانه بحرانی اعلام کسری:</span>
              <span className="font-fanum font-bold text-stone-200">کمتر از ۳ عدد آزاد</span>
            </div>
          </div>

          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200">تراکنش‌های ناموفق شاپرک</span>
              <CreditCard size={16} className="text-amber-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-fanum text-amber-400">
                {toFaDigits(kpis.failedPaymentsCount)}
              </span>
              <span className="text-xs text-stone-400 font-sans">تراکنش دارای خطای بانکی</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400 flex items-center justify-between">
              <span>پیگیری پشتیبانی:</span>
              <span className="text-stone-300 font-sans">ارسال مجدد لینک پرداخت</span>
            </div>
          </div>
        </div>

        {/* 2-Column Section: Critical Stock Warning vs Latest Verified Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Stock List */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" />
                <h3 className="text-sm font-bold text-white">کالاهای نیازمند شارژ فوری انبار</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/catalog/inventory')}
                className="text-xs text-[#eed29d] hover:text-[#ba8d3d]"
              >
                انبارداری ←
              </button>
            </div>

            <div className="space-y-2.5">
              {criticalVariantsList.map((v) => {
                const free = v.onHandStock - v.reservedStock;
                return (
                  <div
                    key={v.sku}
                    onClick={() => navigate('/admin/catalog/inventory')}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{v.sku}</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-sans">
                          کسری موجودی
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">
                        رنگ {v.colorName} · سایز {v.size} (کل موجودی فیزیکی: {toFaDigits(v.onHandStock)})
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-xs font-bold text-rose-400 font-fanum">
                        موجودی آزاد: {toFaDigits(free)} عدد
                      </div>
                      <div className="text-[10px] text-stone-500 font-fanum">
                        رزرو: {toFaDigits(v.reservedStock)} عدد
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Latest Verified Demo Payments */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-[#ba8d3d]" />
                <h3 className="text-sm font-bold text-white">آخرین تراکنش‌های تاییدشده شاپرک</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/sales/payments')}
                className="text-xs text-[#eed29d] hover:text-[#ba8d3d]"
              >
                تمام تراکنش‌ها ←
              </button>
            </div>

            <div className="space-y-2.5">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate('/admin/sales/payments')}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {p.method === 'saman_gateway' ? 'درگاه سامان کیش' : 'زرین‌پال اختصاصی'}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans">
                        موفق و تسویه
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1 font-mono">
                      ردیابی: {p.traceNumber} · سفارش: {p.orderId}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      آی‌پی امن: {p.maskedIpAddress}
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-bold text-[#eed29d] font-fanum">
                      {toFaDigits(p.amountTomans.toLocaleString())} تومان
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      {p.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. TEAM WORK REPORT & WORKSHOP OPERATIONS */}
      <section aria-labelledby="team-status-heading" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 id="team-status-heading" className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-[#ba8d3d]" />
              گزارش شیفت کاری و آمادگی تیم کارگاه
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              پرسنل حاضر در خط، وظایف فعال و توزیع کار بین شیفت‌ها
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/overview/work-report')}
              className="text-xs text-[#eed29d] hover:text-[#ba8d3d] flex items-center gap-1 font-medium cursor-pointer"
            >
              گزارش تفصیلی شیفت <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/team/tasks')}
              className="text-xs text-stone-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
            >
              کارتابل وظایف <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-200">پرسنل حاضر در شیفت کاری</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-black font-fanum text-emerald-400">
                  {toFaDigits(kpis.teamWorkReport.onlineStaffCount)}
                </span>
                <span className="text-xs text-stone-400 font-sans">
                  نفر حاضر (از {toFaDigits(kpis.teamWorkReport.totalStaffCount)} پرسنل کل کارگاه)
                </span>
              </div>
            </div>
            <div className="flex items-center -space-x-2 space-x-reverse pt-3 border-t border-white/5">
              {state.staff.filter((s) => s.isOnline).map((st) => (
                <img
                  key={st.id}
                  src={st.avatarUrl}
                  alt={st.fullName}
                  title={`${st.fullName} (${st.role})`}
                  className="w-8 h-8 rounded-full border-2 border-stone-900 object-cover"
                />
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-200">وضعیت پیشرفت وظایف تیمی</span>
              <div className="my-2 flex items-baseline gap-3">
                <div>
                  <span className="text-2xl font-black font-fanum text-emerald-400">
                    {toFaDigits(kpis.teamWorkReport.completedTasks)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">انجام‌شده</span>
                </div>
                <div className="border-r border-white/10 pr-3">
                  <span className="text-2xl font-black font-fanum text-amber-400">
                    {toFaDigits(kpis.teamWorkReport.pendingTasks)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">در دست اقدام</span>
                </div>
                <div className="border-r border-white/10 pr-3">
                  <span className="text-2xl font-black font-fanum text-rose-400">
                    {toFaDigits(kpis.teamWorkReport.urgentTasks)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">فوری و معوق</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400">
              مهلت تحویل وظایف روزانه: پیش از پایان شیفت عصر (ساعت ۲۰:۰۰)
            </div>
          </div>

          <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-200">دستور کار بعدی کارگاه</span>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                ارسال محموله نوبت ظهر به باربری تیپاکس و آماده‌سازی هد پرینتر برای چاپ سری جدید سفارشات شخصی‌سازی.
              </p>
            </div>
            <Button
              variant="brass"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate('/admin/overview/work-report')}
            >
              مشاهده کارنامه کارگاه و گزارش روزانه
            </Button>
          </div>
        </div>
      </section>

      {/* Deep Inspection Drawer for Orders */}
      <OrderInspectionDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
};
