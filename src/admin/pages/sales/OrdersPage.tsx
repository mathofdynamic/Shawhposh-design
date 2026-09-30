/**
 * Shahpoosh Luxury Streetwear - Order Operations Center
 * Prompt 10: Serious Operations UX, Dense Readable Filters, Saved Views, Exceptions Queue, and Deep Links
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Eye,
  RotateCcw,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ExternalLink,
  Layers,
  Palette,
  Truck,
  ArrowUpRight,
  Search,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  SearchInput,
  Pagination,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { Order, OrderStatus, PaymentStatus } from '../../domain/types';
import {
  toFaDigits,
  formatPriceTomans,
  formatPersianDate,
  maskPhoneNumber,
} from '../../utils/formatters';
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  getOrderType,
  getOrderTypeLabelFa,
  detectOrderExceptions,
  OrderType,
} from '../../domain/orderStateMachine';
import { OrderInspectionDrawer } from '../../components/orders/OrderInspectionDrawer';
import { ManualOrderModal } from '../../components/orders/ManualOrderModal';

type SavedViewPreset = 'all' | 'pending' | 'custom_approval' | 'processing' | 'exceptions';

export const OrdersPage: React.FC = () => {
  const { state, getOrders, issueSimulatedRefund, getOrderExceptions } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activePreset, setActivePreset] = useState<SavedViewPreset>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Drawers and Modals
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);

  // Compute Exception Map for instantaneous lookup
  const exceptionsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof detectOrderExceptions>>();
    const nowIso = state.demoClockIso;

    for (const order of state.orders) {
      const payment = state.payments.find((p) => p.orderId === order.id);
      const designs = state.customDesigns.filter((d) => d.orderId === order.id);
      const jobs = state.productionJobs.filter((j) => j.orderId === order.id);
      const shipment = state.shipments.find((s) => s.orderId === order.id);

      const exc = detectOrderExceptions({
        order,
        nowIso,
        payment,
        designs,
        jobs,
        shipment,
        variants: state.variants,
      });

      if (exc.length > 0) {
        map.set(order.id, exc);
      }
    }
    return map;
  }, [state.orders, state.payments, state.customDesigns, state.productionJobs, state.shipments, state.variants, state.demoClockIso]);

  // Overall Operational Stats
  const stats = useMemo(() => {
    let pendingCount = 0;
    let customApprovalCount = 0;
    let processingCount = 0;
    let totalExceptionsCount = exceptionsMap.size;
    let totalVolumeTomans = 0;

    state.orders.forEach((o) => {
      totalVolumeTomans += o.totalTomans;
      if (o.status === 'pending_payment') pendingCount++;
      if (o.hasCustomLineItem && o.designStatus !== 'approved' && o.status !== 'cancelled' && o.status !== 'refunded') {
        customApprovalCount++;
      }
      if (o.status === 'in_production' || o.status === 'quality_check' || o.status === 'ready_to_ship') {
        processingCount++;
      }
    });

    return {
      totalOrders: state.orders.length,
      pendingCount,
      customApprovalCount,
      processingCount,
      totalExceptionsCount,
      totalVolumeTomans,
    };
  }, [state.orders, exceptionsMap]);

  // Filter Orders based on Preset, Search, and Dropdowns
  const filteredOrders = useMemo(() => {
    let list = [...state.orders];
    const nowMs = new Date(state.demoClockIso).getTime();

    // 1. Saved View Presets
    if (activePreset === 'pending') {
      list = list.filter((o) => o.status === 'pending_payment' || o.paymentStatus === 'pending');
    } else if (activePreset === 'custom_approval') {
      list = list.filter(
        (o) => o.hasCustomLineItem && o.designStatus !== 'approved' && o.status !== 'cancelled' && o.status !== 'refunded'
      );
    } else if (activePreset === 'processing') {
      list = list.filter(
        (o) => o.status === 'paid_processing' || o.status === 'in_production' || o.status === 'quality_check' || o.status === 'ready_to_ship'
      );
    } else if (activePreset === 'exceptions') {
      list = list.filter((o) => exceptionsMap.has(o.id));
    }

    // 2. Status Dropdown
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }

    // 3. Payment Dropdown
    if (paymentFilter !== 'all') {
      list = list.filter((o) => o.paymentStatus === paymentFilter);
    }

    // 4. Type Dropdown (standard, custom, mixed)
    if (typeFilter !== 'all') {
      list = list.filter((o) => getOrderType(o) === typeFilter);
    }

    // 5. Date Filter
    if (dateFilter !== 'all') {
      const days = dateFilter === 'today' ? 1 : dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = nowMs - days * 24 * 3600 * 1000;
      list = list.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    }

    // 6. Search (ID, customer name, phone, city, or SKU)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.city.toLowerCase().includes(q) ||
          o.items.some((it) => it.variantSku.toLowerCase().includes(q) || it.productName.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [state.orders, activePreset, statusFilter, paymentFilter, typeFilter, dateFilter, search, exceptionsMap, state.demoClockIso]);

  // Pagination calculation
  const total = filteredOrders.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Quick Refund Trigger
  const handleRefund = (order: Order) => {
    const res = issueSimulatedRefund(
      order.id,
      order.totalTomans,
      'استرداد فاکتور از طریق پنل سفارشات',
      state.staff[0]?.id || 'STF-01'
    );
    if (res.success) {
      addToast({
        title: 'استرداد وجه ثبت شد',
        description: `مبلغ ${toFaDigits(order.totalTomans.toLocaleString())} تومان استرداد گردید و موجودی رزرو آزاد شد.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطای استرداد',
        description: res.error || 'امکان استرداد برای این سفارش وجود ندارد.',
        type: 'error',
      });
    }
  };

  // Dense Table Columns
  const columns: ColumnDef<Order>[] = [
    {
      key: 'id',
      header: 'شناسه فاکتور',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/admin/sales/orders/${row.id}`)}
              className="font-mono font-bold text-[#eed29d] hover:text-white text-xs transition-colors"
            >
              {row.id}
            </button>
            {row.isRushOrder && (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="سفارش فوری (Rush)" />
            )}
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            {formatPersianDate(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'خریدار و مقصد',
      render: (row) => {
        const cust = state.customers.find((c) => c.id === row.customerId);
        return (
          <div className="max-w-[150px]">
            <div className="font-bold text-white text-xs truncate">{row.customerName}</div>
            <div className="text-[10px] text-stone-400 font-fanum truncate mt-0.5">
              <span>{row.city}</span> · <span>{maskPhoneNumber(row.customerPhone)}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'نوع سفارش',
      render: (row) => {
        const type = getOrderType(row);
        return (
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                type === 'custom'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : type === 'mixed'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'bg-stone-800 text-stone-300 border border-white/10'
              }`}
            >
              {getOrderTypeLabelFa(type)}
            </span>
            <div className="text-[10px] text-stone-400 font-fanum mt-1">
              {toFaDigits(row.items.reduce((acc, it) => acc + it.quantity, 0))} قلم لباس
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalTomans',
      header: 'مبلغ فاکتور',
      render: (row) => (
        <div className="text-left font-fanum">
          <span className="font-bold text-white text-xs block">
            {formatPriceTomans(row.totalTomans)}
          </span>
          {row.discountTomans > 0 && (
            <span className="text-[10px] text-emerald-400 block">
              تخفیف: {formatPriceTomans(row.discountTomans)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'وضعیت پرداخت',
      render: (row) => (
        <Badge
          variant={PAYMENT_STATUS_CONFIG[row.paymentStatus]?.badgeVariant || 'default'}
          size="sm"
        >
          {PAYMENT_STATUS_CONFIG[row.paymentStatus]?.labelFa || row.paymentStatus}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'مرحله سفارش',
      render: (row) => (
        <Badge
          variant={ORDER_STATUS_CONFIG[row.status]?.badgeVariant || 'default'}
          size="sm"
        >
          {ORDER_STATUS_CONFIG[row.status]?.labelFa || row.status}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'پیشرفت کارگاه',
      render: (row) => {
        const job = state.productionJobs.find((j) => j.orderId === row.id);
        const design = state.customDesigns.find((d) => d.orderId === row.id);

        if (row.hasCustomLineItem) {
          if (design && design.status !== 'approved') {
            return (
              <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                <Palette size={13} />
                <span>بررسی طرح آتلیه</span>
              </span>
            );
          }
          if (job) {
            return (
              <span className="text-[11px] text-[#eed29d] font-fanum flex items-center gap-1">
                <Layers size={13} />
                <span>
                  {job.stage === 'printing_dtg'
                    ? 'چاپ DTG'
                    : job.stage === 'qc_inspection'
                    ? 'کنترل کیفی QC'
                    : 'در صف کارگاه'}
                </span>
              </span>
            );
          }
        }

        return <span className="text-[11px] text-stone-500 font-fanum">کالای آماده</span>;
      },
    },
    {
      key: 'shipping',
      header: 'وضعیت ارسال',
      render: (row) => {
        const shipment = state.shipments.find((s) => s.orderId === row.id);
        if (!shipment) return <span className="text-[11px] text-stone-500">در صف بسته‌بندی</span>;

        return (
          <div className="font-fanum text-[11px]">
            <div className="text-stone-300 flex items-center gap-1">
              <Truck size={12} className="text-stone-400" />
              <span>{shipment.carrier === 'tipax' ? 'تیپاکس' : 'پست پیشتاز'}</span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono">
              {shipment.trackingCode ? toFaDigits(shipment.trackingCode) : 'بدون کد'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actionRequired',
      header: 'اقدام مورد نیاز',
      render: (row) => {
        const exceptions = exceptionsMap.get(row.id);
        if (exceptions && exceptions.length > 0) {
          const exc = exceptions[0];
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                exc.severity === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              <AlertTriangle size={11} />
              <span>{exc.titleFa}</span>
            </span>
          );
        }

        if (row.status === 'ready_to_ship') {
          return (
            <span className="text-[10px] text-sky-400 font-bold">آماده صدور بارنامه</span>
          );
        }

        return <span className="text-[10px] text-stone-500">فرآیند عادی</span>;
      },
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
            onClick={() => navigate(`/admin/sales/orders/${row.id}`)}
            title="مشاهده شناسنامه و پرونده عملیاتی کامل"
            icon={ArrowUpRight}
          >
            پرونده
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="text-[11px] py-1 px-2 h-7"
            onClick={() => setSelectedOrderId(row.id)}
            title="بازرسی سریع در کشوی کنار صفحه"
            icon={Eye}
          >
            کشو
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      {/* Page Header */}
      <AdminPageHeader
        title="مدیریت و پردازش سفارش‌ها"
        description="میز کار عملیاتی جهت بررسی فاکتورها، انطباق مالی شاپرک، تایید طرح‌های آتلیه، خط تولید DTG و رسیدگی به استثناها."
        badge={toFaDigits(stats.totalOrders)}
        badgeVariant="brass"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="brass"
              size="sm"
              icon={Plus}
              onClick={() => setIsManualOrderModalOpen(true)}
            >
              ثبت سفارش دستی (آزمایشی)
            </Button>
          </div>
        }
      />

      {/* Top Operations KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setActivePreset('all')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activePreset === 'all'
              ? 'bg-[#1e1b18] border-[#ba8d3d] shadow-sm'
              : 'bg-[#141211] border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-[12px] text-stone-400 block mb-1">کل سفارش‌های ثبت‌شده</span>
          <span className="text-xl font-bold font-fanum text-white block">
            {toFaDigits(stats.totalOrders)}
          </span>
          <span className="text-[11px] text-stone-500 mt-1 block">
            ارزش: {formatPriceTomans(stats.totalVolumeTomans)}
          </span>
        </div>

        <div
          onClick={() => setActivePreset('pending')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activePreset === 'pending'
              ? 'bg-[#1e1b18] border-amber-500 shadow-sm'
              : 'bg-[#141211] border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-[12px] text-amber-300/80 block mb-1">معلق پرداخت / بازبینی</span>
          <span className="text-xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(stats.pendingCount)}
          </span>
          <span className="text-[11px] text-stone-500 mt-1 block">نیازمند پیگیری مالی</span>
        </div>

        <div
          onClick={() => setActivePreset('custom_approval')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activePreset === 'custom_approval'
              ? 'bg-[#1e1b18] border-[#ba8d3d] shadow-sm'
              : 'bg-[#141211] border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-[12px] text-[#eed29d] block mb-1">نیازمند تایید طرح آتلیه</span>
          <span className="text-xl font-bold font-fanum text-[#eed29d] block">
            {toFaDigits(stats.customApprovalCount)}
          </span>
          <span className="text-[11px] text-stone-500 mt-1 block">پیش از ورود به خط چاپ</span>
        </div>

        <div
          onClick={() => setActivePreset('processing')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activePreset === 'processing'
              ? 'bg-[#1e1b18] border-sky-500 shadow-sm'
              : 'bg-[#141211] border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-[12px] text-sky-300/80 block mb-1">در چرخه کارگاه و QC</span>
          <span className="text-xl font-bold font-fanum text-sky-400 block">
            {toFaDigits(stats.processingCount)}
          </span>
          <span className="text-[11px] text-stone-500 mt-1 block">چاپ DTG و بسته‌بندی</span>
        </div>

        <div
          onClick={() => setActivePreset('exceptions')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer col-span-2 lg:col-span-1 ${
            activePreset === 'exceptions'
              ? 'bg-rose-950/40 border-rose-500 shadow-sm'
              : 'bg-[#141211] border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-[12px] text-rose-300 block mb-1">صف استثناها و هشدارها</span>
          <span className="text-xl font-bold font-fanum text-rose-400 block">
            {toFaDigits(stats.totalExceptionsCount)}
          </span>
          <span className="text-[11px] text-rose-400/80 mt-1 block">اقدام فوری کارشناسی</span>
        </div>
      </div>

      {/* Saved View Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setActivePreset('all');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activePreset === 'all'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          همه سفارش‌ها ({toFaDigits(stats.totalOrders)})
        </button>

        <button
          onClick={() => {
            setActivePreset('pending');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activePreset === 'pending'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          در انتظار پرداخت ({toFaDigits(stats.pendingCount)})
        </button>

        <button
          onClick={() => {
            setActivePreset('custom_approval');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activePreset === 'custom_approval'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          تایید طرح آتلیه ({toFaDigits(stats.customApprovalCount)})
        </button>

        <button
          onClick={() => {
            setActivePreset('processing');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activePreset === 'processing'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          در گردش چاپ و QC ({toFaDigits(stats.processingCount)})
        </button>

        <button
          onClick={() => {
            setActivePreset('exceptions');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
            activePreset === 'exceptions'
              ? 'bg-rose-500 text-white'
              : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
          }`}
        >
          <ShieldAlert size={14} />
          <span>صف استثناها ({toFaDigits(stats.totalExceptionsCount)})</span>
        </button>
      </div>

      {/* Dense Filter Bar */}
      <div className="p-4 bg-[#141211] border border-white/10 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="جستجو در شناسه فاکتور، خریدار، تلفن، شهر یا SKU..."
            />
          </div>

          {/* Order Status */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[42px] bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام وضعیت‌های سفارش</option>
              <option value="pending_payment">معلق پرداخت</option>
              <option value="paid_processing">تاییدشده / در صف</option>
              <option value="in_production">خط چاپ DTG</option>
              <option value="quality_check">کنترل کیفیت (QC)</option>
              <option value="ready_to_ship">آماده بسته‌بندی/ارسال</option>
              <option value="shipped">ارسال شده با باربری</option>
              <option value="delivered">تحویل داده شده</option>
              <option value="cancelled">لغو شده</option>
              <option value="refunded">مسترد شده</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="lg:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[42px] bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام وضعیت‌های پرداخت</option>
              <option value="verified_paid">پرداخت تاییدشده</option>
              <option value="pending">در انتظار پرداخت</option>
              <option value="failed">پرداخت ناموفق</option>
              <option value="refunded">استرداد وجه</option>
            </select>
          </div>

          {/* Order Type */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام انواع سفارش</option>
              <option value="standard">کالای آماده</option>
              <option value="custom">سفارشی آتلیه (POD)</option>
              <option value="mixed">ترکیبی (آماده + سفارشی)</option>
            </select>
          </div>

          {/* Date Range Preset */}
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

        {/* Clear Filters Action */}
        {(search || statusFilter !== 'all' || paymentFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || activePreset !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-stone-400">
            <span>
              نمایش <strong className="font-fanum text-white">{toFaDigits(filteredOrders.length)}</strong> از {toFaDigits(stats.totalOrders)} سفارش فیلتر شده
            </span>
            <button
              onClick={() => {
                setActivePreset('all');
                setSearch('');
                setStatusFilter('all');
                setPaymentFilter('all');
                setTypeFilter('all');
                setDateFilter('all');
                setCurrentPage(1);
              }}
              className="text-[#eed29d] hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>پاکسازی تمام فیلترها</span>
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          columns={columns}
          data={paginatedOrders}
          keyExtractor={(row) => row.id}
          emptyMessage="هیچ سفارشی منطبق با معیارهای فیلتر شده یافت نشد."
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

      {/* Manual Order Creation Modal */}
      <ManualOrderModal
        isOpen={isManualOrderModalOpen}
        onClose={() => setIsManualOrderModalOpen(false)}
        onOrderCreated={(newId) => {
          navigate(`/admin/sales/orders/${newId}`);
        }}
      />

      {/* Quick Inspection Drawer */}
      <OrderInspectionDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onRefundOrder={handleRefund}
      />
    </div>
  );
};
