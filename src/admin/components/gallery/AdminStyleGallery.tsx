import React, { useState, useMemo } from 'react';
import {
  Button,
  IconButton,
  Badge,
  KPICard,
  Table,
  ColumnDef,
  Toolbar,
  SearchInput,
  FilterDropdown,
  DateRangeSelector,
  DateRangePreset,
  SegmentedControl,
  Tabs,
  Breadcrumb,
  Drawer,
  Dialog,
  ConfirmDialog,
  FormField,
  Input,
  Select,
  Switch,
  DateTimeDisplay,
  MoneyDisplay,
  Avatar,
  Pagination,
  EmptyState,
  ErrorState,
  StatusTimeline,
  TimelineEvent,
  ChartContainer,
  FilePreview,
  PermissionGate,
  DemoModeNoticeBar,
  useToast,
} from '../ui';
import {
  Plus,
  Trash2,
  Download,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Printer,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Clock,
  ShieldCheck,
  UserCheck,
  Box,
  Users,
} from 'lucide-react';
import { toFaDigits, maskPhoneNumber, maskIpAddress } from '../../utils/formatters';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StaffRole, Order, OrderStatus } from '../../domain/types';

export const AdminStyleGallery: React.FC<{ onBackToStore: () => void }> = ({ onBackToStore }) => {
  const {
    state,
    demoClock,
    getDashboardKPIs,
    getOrders,
    getOrderById,
    getVariants,
    getActivityLogs,
    getStaffAndTasks,
    updateVariantStock,
    approveCustomDesign,
    rejectCustomDesign,
    updateOrderStatus,
    issueSimulatedRefund,
  } = useAdminRepository();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'forms' | 'overlays' | 'domain'>('overview');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [currentRole, setCurrentRole] = useState<StaffRole>('super_admin');

  // Selected Order for Drawer inspection
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrderDetails = useMemo(() => {
    return selectedOrderId ? getOrderById(selectedOrderId) : null;
  }, [selectedOrderId, getOrderById]);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Form State for Stock Adjustment mutation
  const [selectedSku, setSelectedSku] = useState('TSH-OVR-BLK-XL');
  const [newStockValue, setNewStockValue] = useState('15');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('رسیدن بار جدید از کارگاه ریسندگی');

  // Live KPI Data
  const kpis = useMemo(() => {
    return getDashboardKPIs(dateRange);
  }, [getDashboardKPIs, dateRange]);

  // Live Orders Data
  const orderQueryResult = useMemo(() => {
    return getOrders({
      search,
      datePreset: dateRange,
      status: statusFilter === 'all' ? undefined : (statusFilter as OrderStatus),
      page: currentPage,
      pageSize,
    });
  }, [getOrders, search, dateRange, statusFilter, currentPage, pageSize]);

  // Handle Stock Mutation
  const handleStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVariant = getVariants().find((v) => v.sku === selectedSku);
    const parsedStock = parseInt(newStockValue, 10);

    if (isNaN(parsedStock)) {
      addToast({
        title: 'خطا در مقدار ورودی',
        description: 'لطفاً یک عدد صحیح برای موجودی انبار وارد نمایید.',
        type: 'error',
      });
      return;
    }

    const currentStaff = state.staff.find((s) => s.role === currentRole) || state.staff[0];
    const res = updateVariantStock(selectedSku, parsedStock, currentStaff.id, stockAdjustmentReason);

    if (!res.success) {
      addToast({
        title: 'نقض ناوردایی انبار',
        description: res.error || 'عملیات با خطا مواجه شد.',
        type: 'error',
      });
    } else {
      addToast({
        title: 'بروزرسانی موفق موجودی انبار',
        description: `موجودی تنوع ${selectedSku} به ${toFaDigits(parsedStock)} عدد تغییر یافت و در لاگ کارگاه ثبت شد.`,
        type: 'success',
      });
    }
  };

  // Handle Design Approval
  const handleApproveDesign = (designId: string) => {
    const currentStaff = state.staff.find((s) => s.role === currentRole) || state.staff[1];
    const res = approveCustomDesign(designId, currentStaff.id);
    if (res.success) {
      addToast({
        title: 'طرح با موفقیت تایید شد',
        description: `شناسه طرح ${designId} جهت چاپ به خط تولید DTG منتقل گردید.`,
        type: 'success',
      });
    }
  };

  // Handle Design Rejection
  const handleRejectDesign = (designId: string) => {
    if (!rejectReason.trim()) {
      addToast({
        title: 'دلیل رد الزامی است',
        description: 'لطفاً علت عدم تایید فنی را به منظور اطلاع به مشتری یا آتلیه وارد کنید.',
        type: 'warning',
      });
      return;
    }
    const currentStaff = state.staff.find((s) => s.role === currentRole) || state.staff[1];
    const res = rejectCustomDesign(designId, currentStaff.id, rejectReason);
    if (res.success) {
      setIsRejectModalOpen(false);
      setRejectReason('');
      addToast({
        title: 'طرح رد شد',
        description: `وضعیت طرح ${designId} به رد شده تغییر یافت و لاگ ثبت گردید.`,
        type: 'error',
      });
    }
  };

  // Handle Refund
  const handleRefundOrder = (order: Order) => {
    const currentStaff = state.staff.find((s) => s.role === currentRole) || state.staff[5];
    const res = issueSimulatedRefund(
      order.id,
      order.totalTomans,
      'درخواست استرداد ثبت‌شده در پنل مدیریت',
      currentStaff.id
    );
    if (res.success) {
      setIsConfirmOpen(false);
      addToast({
        title: 'استرداد وجه ثبت شد',
        description: `مبلغ ${toFaDigits(order.totalTomans.toLocaleString())} تومان به وضعیت مرجوعی منتقل و رزرو کالا آزاد گردید.`,
        type: 'warning',
      });
    }
  };

  // Table Columns
  const columns: ColumnDef<Order>[] = [
    {
      key: 'id',
      header: 'شناسه سفارش',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedOrderId(row.id)}
          className="font-mono text-xs font-bold text-[#eed29d] hover:underline cursor-pointer tracking-wider"
          dir="ltr"
        >
          {row.id}
        </button>
      ),
    },
    {
      key: 'customerName',
      header: 'مشتری',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.customerName} size="sm" />
          <div className="text-right">
            <span className="font-semibold text-white block">{row.customerName}</span>
            <span className="text-[10px] text-gray-500 font-fanum">{maskPhoneNumber(row.customerPhone)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'اقلام و تنوع (SKU)',
      render: (row) => (
        <div className="flex flex-col gap-1 max-w-[200px]">
          {row.items.map((it) => (
            <div key={it.id} className="flex items-center gap-1.5 text-[11px]">
              <span className="font-mono text-gray-300 bg-white/5 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                {it.variantSku}
              </span>
              <span className="text-gray-400 truncate">{it.productName}</span>
              {it.isCustomPod && (
                <Badge tone="brass">POD</Badge>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totalTomans',
      header: 'مبلغ کل',
      align: 'left',
      sortable: true,
      render: (row) => <MoneyDisplay amount={row.totalTomans} size="sm" />,
    },
    {
      key: 'paymentStatus',
      header: 'وضعیت پرداخت',
      render: (row) => {
        if (row.paymentStatus === 'verified_paid') return <Badge tone="success">واریز تایید شده</Badge>;
        if (row.paymentStatus === 'pending') return <Badge tone="warning">در انتظار واریز</Badge>;
        if (row.paymentStatus === 'refunded') return <Badge tone="danger">مسترد شده</Badge>;
        return <Badge tone="danger">ناموفق / لغو</Badge>;
      },
    },
    {
      key: 'status',
      header: 'مرحله سفارش',
      render: (row) => {
        switch (row.status) {
          case 'in_production':
            return <Badge tone="info">در خط چاپ DTG</Badge>;
          case 'quality_check':
            return <Badge tone="brass">آزمون کیفی (QC)</Badge>;
          case 'ready_to_ship':
          case 'shipped':
            return <Badge tone="neutral">ارسال شده / آماده</Badge>;
          case 'delivered':
            return <Badge tone="success">تحویل مشتری</Badge>;
          case 'refunded':
            return <Badge tone="danger">مرجوعی</Badge>;
          default:
            return <Badge tone="warning">پردازش اداری</Badge>;
        }
      },
    },
    {
      key: 'createdAt',
      header: 'زمان ثبت',
      align: 'left',
      render: (row) => <DateTimeDisplay iso={row.createdAt} showTime showRelative />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f5f2eb] flex flex-col font-sans select-none">
      {/* Global Persistent Synthetic Demo Banner */}
      <DemoModeNoticeBar />

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-[#131211]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToStore}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <ArrowRight size={14} />
            <span>بازگشت به ویترین</span>
          </button>
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <span className="w-2 h-2 rounded-full bg-[#ba8d3d] animate-pulse" />
            <h1 className="text-sm font-bold text-white tracking-wide">
              شاه‌پوش · میز مدیریت و عملیات کارگاه (Admin Operations Hub)
            </h1>
            <span className="text-[10px] bg-[#ba8d3d]/15 text-[#eed29d] border border-[#ba8d3d]/30 px-2 py-0.5 rounded-md font-mono">
              DATA REPOSITORY ACTIVE
            </span>
          </div>
        </div>

        {/* Staff Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline">نقش کاربری شبیه‌سازی:</span>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as StaffRole)}
            className="bg-[#181716] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer focus:ring-1 focus:ring-[#ba8d3d]"
          >
            <option value="super_admin">کیوان دادگر (مدیر ارشد)</option>
            <option value="designer_reviewer">سهراب زارع (کارشناس آتلیه و طرح)</option>
            <option value="production_operator">وحید رضوانی (اپراتور چاپخانه)</option>
            <option value="support_finance">مریم باطنی (پشتیبانی و مالی)</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Navigation Breadcrumb & Primary Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: 'میز عملیات کارگاه' },
              { label: 'داده‌های واقعی شبیه‌سازی شده', isCurrent: true },
            ]}
          />

          <Tabs
            tabs={[
              { id: 'overview', label: 'شاخص‌های کلیدی (KPIs)' },
              { id: 'tables', label: `سفارشات (${toFaDigits(orderQueryResult.total)})` },
              { id: 'forms', label: 'اصلاح موجودی و فرم‌ها' },
              { id: 'overlays', label: 'دیالوگ‌ها و تایید مخرب' },
              { id: 'domain', label: 'گردش کار آتلیه و لاگ‌ها' },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>

        {/* TAB 1: OVERVIEW & REAL DYNAMIC KPIS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* KPI Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">کارت‌های شاخص عملکرد زنده (Dynamic KPIs)</h2>
                  <p className="text-xs text-gray-400">
                    محاسبه بلادرنگ بر اساس سفارشات، پرداخت‌های تاییدشده و ناوردایی‌های موجودی
                  </p>
                </div>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="فروش خالص دوره"
                  value={kpis.netSalesTomans}
                  unit="تومان"
                  definition="فروش ناخالص تایید شده منهای مبالغ استرداد شده (تطبیق ۱۰۰٪ با دفاتر مالی)"
                  timeframe={dateRange === 'today' ? 'امروز' : dateRange === '7d' ? '۷ روز اخیر' : dateRange === '30d' ? '۳۰ روز اخیر' : 'کل دوره'}
                  changePercent={14.8}
                  trendText="تراکنش‌های قطعی شاپرک"
                  icon={<TrendingUp size={20} />}
                />
                <KPICard
                  title="سفارش‌های در دست اقدام"
                  value={kpis.activeProductionCount}
                  unit="سفارش"
                  definition="سفارش‌های در حال تولید، چاپ مستقیم DTG، یا آزمون کنترل کیفی"
                  timeframe="صف کارگاه"
                  changePercent={-2.4}
                  trendText="گردش خط تولید"
                  icon={<Printer size={20} />}
                />
                <KPICard
                  title="طرح‌های در انتظار بررسی"
                  value={kpis.pendingDesignCount}
                  unit="طرح"
                  definition="فایل‌های وکتور یا تصویری کاربران نیازمند بازبینی رزولوشن در آتلیه"
                  timeframe="نوبت داوری"
                  changePercent={0}
                  icon={<FileCheck size={20} />}
                />
                <KPICard
                  title="اقلام با موجودی بحرانی"
                  value={kpis.lowStockCount}
                  unit="کد تنوع"
                  definition="تنوع‌هایی که موجودی قابل فروش آن‌ها به زیر حد نصاب تعیین‌شده رسیده است"
                  timeframe="انبار مرکزی"
                  changePercent={kpis.lowStockCount > 0 ? 5 : 0}
                  icon={<AlertTriangle size={20} className="text-amber-400" />}
                />
              </div>
            </div>

            {/* Semantic Distinct Counter Summary */}
            <div className="bg-[#131211] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    تفکیک معنایی شاخص‌های موجودی و ترافیک (Semantic Distinct Invariants)
                  </h3>
                  <p className="text-xs text-gray-400">
                    تضمین تمایز عددی میان محصولات، تنوع‌ها، موجودی قطعه‌ای، کاربران و نشست‌ها
                  </p>
                </div>
                <Badge tone="success">ناوردایی‌ها پایدار</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[11px] text-gray-400 block mb-1">مدل‌های پایه لباس</span>
                  <span className="text-lg font-bold text-white font-fanum">{toFaDigits(kpis.metrics.productCount)}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[11px] text-gray-400 block mb-1">تنوع‌های انبار (SKUs)</span>
                  <span className="text-lg font-bold text-[#eed29d] font-fanum">{toFaDigits(kpis.metrics.variantSkuCount)}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[11px] text-gray-400 block mb-1">تعداد البسه فیزیکی</span>
                  <span className="text-lg font-bold text-emerald-400 font-fanum">{toFaDigits(kpis.metrics.totalUnitsOnHand)}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[11px] text-gray-400 block mb-1">مشتریان اختصاصی</span>
                  <span className="text-lg font-bold text-white font-fanum">{toFaDigits(kpis.metrics.customerCount)}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[11px] text-gray-400 block mb-1">بازدید یکتا / نشست‌ها</span>
                  <span className="text-xs font-mono text-[#ba8d3d] block mt-1 dir-ltr">
                    {toFaDigits(kpis.traffic.visitors)} / {toFaDigits(kpis.traffic.sessions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Performance Chart */}
            <ChartContainer
              title="روند فروش خالص روزانه"
              subtitle="محاسبه فروش روزانه با کسر مبالغ استردادی نسبت به تقویم آزمایشی"
              timeframe={dateRange}
              onTimeframeChange={setDateRange}
            >
              <div className="w-full h-48 flex items-end gap-2 pt-6 px-4">
                {state.analytics.dailySnapshots.slice(-14).map((snap, i) => {
                  const maxSales = 3500000;
                  const pct = Math.min(100, Math.max(10, Math.round((snap.netSalesTomans / maxSales) * 100)));
                  return (
                    <div key={snap.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full bg-[#ba8d3d]/40 group-hover:bg-[#ba8d3d] rounded-t transition-all duration-150 relative cursor-pointer"
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-fanum text-white bg-black/90 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-[#ba8d3d]/30">
                          {toFaDigits(Math.round(snap.netSalesTomans / 1000).toLocaleString())} هـ.ت
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-fanum truncate max-w-[28px]">
                        {toFaDigits(snap.date.slice(8, 10))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ChartContainer>
          </div>
        )}

        {/* TAB 2: REAL DYNAMIC ORDERS TABLE */}
        {activeTab === 'tables' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Toolbar
              startContent={
                <div className="flex flex-wrap items-center gap-2">
                  <SearchInput
                    value={search}
                    onChange={(v) => {
                      setSearch(v);
                      setCurrentPage(1);
                    }}
                    placeholder="جستجو در شناسه، مشتری، شماره یا شهر..."
                    className="w-64"
                  />
                  <FilterDropdown
                    label="فیلتر وضعیت"
                    options={[
                      { id: 'all', label: 'همه وضعیت‌ها' },
                      { id: 'paid_processing', label: 'در نوبت آماده‌سازی' },
                      { id: 'in_production', label: 'در حال چاپ DTG' },
                      { id: 'quality_check', label: 'آزمون کیفی (QC)' },
                      { id: 'shipped', label: 'تحویل پست و پیک' },
                      { id: 'delivered', label: 'تحویل داده شده' },
                      { id: 'pending_payment', label: 'در انتظار پرداخت' },
                      { id: 'refunded', label: 'مسترد شده' },
                    ]}
                    selectedIds={[statusFilter]}
                    onChange={(ids) => {
                      setStatusFilter(ids[0] || 'all');
                      setCurrentPage(1);
                    }}
                  />
                </div>
              }
              endContent={
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    options={[
                      { value: 'normal', label: 'عادی' },
                      { value: 'compact', label: 'فشرده' },
                    ]}
                    value={density}
                    onChange={(v) => setDensity(v)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addToast({
                        title: 'خروجی اکسل',
                        description: `تعداد ${toFaDigits(orderQueryResult.total)} رکورد سفارش آماده استخراج شد.`,
                        type: 'info',
                      });
                    }}
                  >
                    <Download size={14} className="ml-1" />
                    خروجی
                  </Button>
                </div>
              }
            />

            <Table
              data={orderQueryResult.items}
              columns={columns}
              keyExtractor={(row) => row.id}
              selectedIds={selectedRowIds}
              onSelectRow={(id) => {
                setSelectedRowIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              onSelectAll={() => {
                if (selectedRowIds.length === orderQueryResult.items.length) {
                  setSelectedRowIds([]);
                } else {
                  setSelectedRowIds(orderQueryResult.items.map((i) => i.id));
                }
              }}
              density={density}
              emptyMessage="هیچ سفارشی با شرایط جستجوی انتخابی یافت نگردید."
            />

            <Pagination
              currentPage={currentPage}
              totalPages={orderQueryResult.totalPages}
              totalItems={orderQueryResult.total}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 3: MUTATION FORM WITH INVARIANT GUARDS */}
        {activeTab === 'forms' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
            {/* Stock Adjustment Form */}
            <div className="lg:col-span-6 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  اصلاح دستی موجودی فیزیکی انبار (Stock Invariant Mutation)
                </h3>
                <p className="text-xs text-gray-400">
                  انبارگردانی مستقیم؛ سیستم با گارد ناوردایی از منفی شدن موجودی قابل فروش جلوگیری می‌کند.
                </p>
              </div>

              <form onSubmit={handleStockUpdate} className="space-y-4">
                <FormField label="کد تنوع کالا (SKU)">
                  <Select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                  >
                    {getVariants().slice(0, 15).map((v) => (
                      <option key={v.sku} value={v.sku}>
                        {v.sku} (موجودی فیزیکی: {toFaDigits(v.onHandStock)} | رزرو شده: {toFaDigits(v.reservedStock)})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label="موجودی فیزیکی جدید (تعداد قطعه)"
                  description="موجودی جدید نباید کمتر از کالاهای رزرو شده در سفارشات تایید شده باشد."
                >
                  <Input
                    type="number"
                    value={newStockValue}
                    onChange={(e) => setNewStockValue(e.target.value)}
                    dir="ltr"
                    className="font-mono text-left"
                  />
                </FormField>

                <FormField label="دلیل اصلاح موجودی">
                  <Input
                    value={stockAdjustmentReason}
                    onChange={(e) => setStockAdjustmentReason(e.target.value)}
                  />
                </FormField>

                <div className="pt-2">
                  <Button type="submit" variant="brass">
                    ثبت تغییر موجودی در انبار و صدور لاگ
                  </Button>
                </div>
              </form>
            </div>

            {/* Low-stock Warnings Showcase */}
            <div className="lg:col-span-6 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">اقلام نیازمند شارژ مجدد (Low Stock Alerts)</h3>
                <p className="text-xs text-gray-400">
                  تنوع‌هایی که موجودی قابل فروش (فیزیکی منهای رزرو) کمتر از آستانه اضطراری است.
                </p>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {getVariants({ lowStockOnly: true }).map((v) => (
                  <div
                    key={v.sku}
                    className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-[#eed29d] font-bold block" dir="ltr">
                        {v.sku}
                      </span>
                      <span className="text-gray-400">
                        رنگ: {v.colorName} · سایز: {v.size}
                      </span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-amber-400 font-bold block">
                        قابل فروش: {toFaDigits(v.onHandStock - v.reservedStock)}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        (فیزیکی: {toFaDigits(v.onHandStock)} - رزرو: {toFaDigits(v.reservedStock)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OVERLAYS & DESTRUCTIVE ACTIONS */}
        {activeTab === 'overlays' && (
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">پنجره‌های کشویی، دیالوگ‌ها و تایید مخرب</h3>
              <p className="text-xs text-gray-400">
                بررسی لایه‌های معلق، دیالوگ تایید عملیات استرداد وجه و بستن با کلید Escape
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="brass"
                onClick={() => {
                  if (orderQueryResult.items.length > 0) {
                    setSelectedOrderId(orderQueryResult.items[0].id);
                  }
                }}
              >
                باز کردن کشوی جزئیات سفارش نمونه
              </Button>

              <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
                راهنمای قوانین آتلیه چاپ
              </Button>

              <Button variant="destructive" onClick={() => setIsConfirmOpen(true)}>
                شبیه‌سازی استرداد وجه سفارش
              </Button>
            </div>

            {/* Error and Empty States Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
              <EmptyState
                title="موردی در انبار یافت نشد"
                description="هیچ تنوعی با فیلترهای انتخابی در انبار مرکزی ثبت نگردیده است."
                action={{
                  label: 'پاکسازی فیلترها',
                  onClick: () => {
                    setSearch('');
                    setStatusFilter('all');
                  },
                }}
              />
              <ErrorState
                title="عدم برقراری ارتباط با سامانه"
                message="دریافت وضعیت استعلام وب‌سرویس با تاخیر مواجه شد."
                errorCode="ERR_POST_GATEWAY_TIMEOUT"
                onRetry={() => {}}
              />
            </div>
          </div>
        )}

        {/* TAB 5: DOMAIN WORKFLOW: TIMELINE, ATELIER REVIEW & AUDIT LOGS */}
        {activeTab === 'domain' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Atelier Custom Design Approval Seam */}
              <div className="lg:col-span-7 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      صف بازبینی طرح‌های سفارشی آتلیه (POD Review Queue)
                    </h3>
                    <p className="text-xs text-gray-400">
                      کارشناس گرافیک پس از بررسی فایل، دستور ارسال به خط DTG را صادر می‌کند.
                    </p>
                  </div>
                  <Badge tone="warning">
                    {toFaDigits(state.customDesigns.filter((d) => d.status === 'under_review').length)} در نوبت
                  </Badge>
                </div>

                <div className="space-y-4">
                  {state.customDesigns.slice(0, 3).map((d) => (
                    <div
                      key={d.id}
                      className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs text-[#ba8d3d] font-bold block" dir="ltr">
                            {d.id} · سفارش {d.orderId}
                          </span>
                          <span className="text-sm font-bold text-white block mt-0.5">{d.title}</span>
                          <span className="text-xs text-gray-400 block">
                            ابعاد: {d.dimensionsMm} · فرمت: {d.format} · تراکم: {toFaDigits(d.resolutionDpi)} DPI
                          </span>
                        </div>
                        <Badge
                          tone={
                            d.status === 'approved'
                              ? 'success'
                              : d.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {d.status === 'approved'
                            ? 'تایید فنی آتلیه'
                            : d.status === 'rejected'
                            ? 'رد شده'
                            : 'در انتظار بازبینی'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
                        <span className="text-xs text-stone-400">{d.reviewerNotes || 'بدون یادداشت'}</span>
                        <div className="flex items-center gap-2">
                          {d.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="brass"
                              onClick={() => handleApproveDesign(d.id)}
                            >
                              تایید فنی طرح
                            </Button>
                          )}
                          {d.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-400 hover:text-rose-300"
                              onClick={() => {
                                setIsRejectModalOpen(true);
                              }}
                            >
                              رد طرح
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Print Spec File Preview */}
              <div className="lg:col-span-5 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">پیش‌نمایش فنی آتلیه چاپ (Print Preview)</h3>
                  <p className="text-xs text-gray-400">مشخصات فایل تایید شده برای پرینتر مستقیم صنعتی</p>
                </div>

                <FilePreview
                  src="https://picsum.photos/seed/heech_tshirt_1/800/800"
                  title="کالیگرافی نستعلیق «هیچ» - نسخه دیجیتال DTG"
                  metadata={{
                    format: 'SVG',
                    dimensionsMm: '۲۸۰ × ۳۸۰ میلی‌متر',
                    resolutionDpi: 300,
                    colorProfile: 'CMYK',
                    isPrintReady: true,
                    notes: 'پروفایل رنگی با زیرلایه سفید (White Underbase) برای پارچه پنبه مشکی کالیبره شد.',
                  }}
                />
              </div>
            </div>

            {/* Live Activity Audit Stream */}
            <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    دفتر رویدادها و لاگ‌های حسابرسی (Live Activity Audit Logs)
                  </h3>
                  <p className="text-xs text-gray-400">
                    ثبت خودکار تمامی تغییرات وضعیت، اصلاحات انبار، استردادها و تاییدات پرسنل
                  </p>
                </div>
                <Badge tone="neutral">{toFaDigits(state.activities.length)} رویداد</Badge>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {getActivityLogs(10).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-stone-900/50 border border-stone-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#ba8d3d] text-[11px]" dir="ltr">
                        {log.actionType}
                      </span>
                      <span className="text-stone-300">{log.description}</span>
                    </div>
                    <div className="flex items-center gap-3 text-stone-500 font-fanum text-[11px]">
                      <span>{log.actorName}</span>
                      <DateTimeDisplay iso={log.timestamp} showTime showRelative />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Drawer for Order Detail Inspection */}
      {selectedOrderDetails && (
        <Drawer
          isOpen={Boolean(selectedOrderId)}
          onClose={() => setSelectedOrderId(null)}
          title={`پرونده سفارش ${selectedOrderDetails.order.id}`}
          subtitle={`مشتری: ${selectedOrderDetails.order.customerName} · شهر: ${selectedOrderDetails.order.city}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrderId(null)}>
                بستن پرونده
              </Button>
              <div className="flex items-center gap-2">
                {selectedOrderDetails.designs.length > 0 &&
                  selectedOrderDetails.designs[0].status === 'under_review' && (
                    <Button
                      variant="brass"
                      size="sm"
                      onClick={() => {
                        handleApproveDesign(selectedOrderDetails.designs[0].id);
                        setSelectedOrderId(null);
                      }}
                    >
                      تایید طرح سفارشی
                    </Button>
                  )}
                {selectedOrderDetails.order.paymentStatus === 'verified_paid' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleRefundOrder(selectedOrderDetails.order);
                      setSelectedOrderId(null);
                    }}
                  >
                    استرداد وجه سفارش
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-right">
            {/* Customer Card */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-500 font-mono block">اطلاعات خریدار و نشانی</span>
              <div className="text-xs text-white font-semibold">
                {selectedOrderDetails.order.customerName} · {selectedOrderDetails.order.customerPhone}
              </div>
              <div className="text-[11px] text-gray-400">{selectedOrderDetails.order.shippingAddress}</div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 block">اقلام سفارش ({selectedOrderDetails.order.items.length}):</span>
              {selectedOrderDetails.order.items.map((it) => (
                <div
                  key={it.id}
                  className="p-3 bg-[#0c0b0a] border border-white/10 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="text-white font-medium block">{it.productName}</span>
                    <span className="text-[10px] text-gray-400 font-mono block" dir="ltr">
                      {it.variantSku} · تعداد: {toFaDigits(it.quantity)}
                    </span>
                    {it.isCustomPod && (
                      <span className="text-[10px] text-[#eed29d] mt-0.5 block">
                        دارای طرح اختصاصی آتلیه شاه‌پوش
                      </span>
                    )}
                  </div>
                  <MoneyDisplay amount={it.subtotalTomans} size="sm" />
                </div>
              ))}
            </div>

            {/* Financial Reconciliation Box */}
            <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>جمع اقلام:</span>
                <MoneyDisplay amount={selectedOrderDetails.order.subtotalTomans} size="sm" />
              </div>
              <div className="flex justify-between text-stone-400">
                <span>هزینه ارسال:</span>
                <MoneyDisplay amount={selectedOrderDetails.order.shippingFeeTomans} size="sm" />
              </div>
              <div className="flex justify-between text-[#eed29d] font-bold pt-1 border-t border-stone-800">
                <span>مبلغ نهایی فاکتور:</span>
                <MoneyDisplay amount={selectedOrderDetails.order.totalTomans} size="sm" />
              </div>
            </div>

            {/* Payment Details */}
            {selectedOrderDetails.payment && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs space-y-1">
                <span className="text-[10px] text-gray-500 font-mono block">تراکنش درگاه بانکی</span>
                <div className="flex justify-between text-stone-300">
                  <span>شناسه پرداخت:</span>
                  <span className="font-mono text-[11px]">{selectedOrderDetails.payment.id}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>شماره پیگیری شاپرک:</span>
                  <span className="font-mono text-[11px]">{selectedOrderDetails.payment.traceNumber}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>آدرس IP امن ثبت تراکنش:</span>
                  <span className="font-mono text-[11px]" dir="ltr">
                    {maskIpAddress(selectedOrderDetails.payment.maskedIpAddress)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* Info Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="راهنمای استانداردهای آتلیه شاه‌پوش"
        description="کلیه طرح‌های ارسالی کاربران پیش از ارسال به دستگاه، از فیلتر اعتبارسنجی گذر می‌کنند."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(false)}>
            متوجه شدم
          </Button>
        }
      >
        <p className="text-xs text-gray-300 leading-relaxed">
          فرمت‌های پشتیبانی شده شامل فایل‌های وکتور SVG بدون پس‌زمینه و تصاویر PNG با تراکم حداقل ۳۰۰ نقطه در اینچ می‌باشند.
        </p>
      </Dialog>

      {/* Reject Design Reason Dialog */}
      <Dialog
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="عدم تایید فنی طرح آتلیه"
        description="لطفاً علت رد طرح را برای ثبت در پرونده و اطلاع به خریدار مشخص نمایید."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (state.customDesigns.length > 0) {
                  handleRejectDesign(state.customDesigns[0].id);
                }
              }}
            >
              ثبت رد طرح
            </Button>
          </div>
        }
      >
        <FormField label="دلیل رد فنی">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثال: رزولوشن تصویر کمتر از ۳۰۰ DPI است یا خطوط برش تراز نیست."
          />
        </FormField>
      </Dialog>

      {/* Confirm Destructive Refund Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (orderQueryResult.items.length > 0) {
            handleRefundOrder(orderQueryResult.items[0]);
          }
        }}
        title="آیا از استرداد وجه این سفارش اطمینان دارید؟"
        description="با ثبت استرداد وجه، مبلغ فاکتور از دفاتر فروش کسر گردیده و اقلام رزرو شده در انبار به طور خودکار آزاد می‌شوند."
        confirmLabel="بله، استرداد وجه ثبت شود"
        cancelLabel="انصراف"
        isDestructive
      />
    </div>
  );
};
