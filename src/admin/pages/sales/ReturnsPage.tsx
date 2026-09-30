import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  User,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, MoneyDisplay, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import {
  ReturnRequest,
  ReturnReason,
  ReturnStatus,
  InspectionOutcome,
  ReturnResolution,
} from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { RefundsPage } from './RefundsPage';

export interface ReturnsPageProps {
  defaultTab?: 'returns' | 'refunds';
}

export const ReturnsPage: React.FC<ReturnsPageProps> = ({ defaultTab = 'returns' }) => {
  const [activeTab, setActiveTab] = useState<'returns' | 'refunds'>(defaultTab);
  const {
    state,
    getReturnRequests,
    createReturnRequest,
    receiveReturnParcel,
    inspectReturnParcel,
    resolveReturnRequest,
  } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ReturnRequest | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Form states for creation
  const [orderSelectId, setOrderSelectId] = useState(state.orders[0]?.id || '');
  const [selectedReason, setSelectedReason] = useState<ReturnReason>('size_mismatch');
  const [customReasonFa, setCustomReasonFa] = useState('');
  const [policyNotesInput, setPolicyNotesInput] = useState(
    'سیاست قراردادی کالاهای سفارشی: در صورت مغایرت ابعادی با جدول سایز یا نقص فنی چاپ، مشمول تعویض رایگان و اصلاح آتلیه می‌گردد.'
  );

  // Form states for inspection
  const [inspectionOutcome, setInspectionOutcome] = useState<InspectionOutcome>('intact_resellable');
  const [restockEligible, setRestockEligible] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Form states for resolution
  const [resolutionChoice, setResolutionChoice] = useState<ReturnResolution>('exchange_replacement');
  const [executeRefundToggle, setExecuteRefundToggle] = useState(true);
  const [executeRestockToggle, setExecuteRestockToggle] = useState(true);

  // Fetch list reactively
  const returnRequests = getReturnRequests({
    status: selectedStatus,
    search: searchQuery,
  });

  // KPI aggregates
  const metrics = useMemo(() => {
    const list = getReturnRequests();
    return {
      total: list.length,
      requested: list.filter((r) => r.status === 'requested').length,
      inspecting: list.filter((r) => r.status === 'received_inspecting').length,
      passed: list.filter((r) => r.status === 'inspection_passed').length,
      refunded: list.filter((r) => r.status === 'refund_processed').length,
      replaced: list.filter((r) => r.status === 'replacement_dispatched').length,
    };
  }, [state.returnRequests]);

  const handleCreateRequest = () => {
    const order = state.orders.find((o) => o.id === orderSelectId);
    if (!order) {
      addToast({ title: 'سفارش انتخاب نشده است', type: 'critical' });
      return;
    }

    const hasCustom = order.items.some((it) => it.isCustomPod) || order.hasCustomLineItem;

    const reasonLabels: Record<ReturnReason, string> = {
      size_mismatch: 'عدم تطابق سایز با جدول راهنما',
      defective_stitching: 'ایراد دوخت یا بافت پارچه',
      print_color_drift: 'مغایرت تناژ رنگ چاپ DTG',
      customer_remorse: 'انصراف شخصی خریدار (پلمپ دست‌نخورده)',
      wrong_item_shipped: 'ارسال مدل یا سایز اشتباه از انبار',
    };

    const res = createReturnRequest({
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map((it) => ({
        sku: it.variantSku,
        productName: it.productName,
        quantity: it.quantity,
        unitPriceTomans: it.unitPriceTomans,
        isCustomPod: it.isCustomPod,
        reason: customReasonFa || reasonLabels[selectedReason],
      })),
      reason: selectedReason,
      reasonFa: customReasonFa || reasonLabels[selectedReason],
      isCustomizedGood: hasCustom,
      policyNotes: policyNotesInput,
      refundAmountTomans: order.totalTomans,
      staffName: 'کارشناس واحد خدمات پس از فروش',
    });

    if (res.success) {
      setCreateModalOpen(false);
      addToast({
        title: 'درخواست مرجوعی با موفقیت ثبت شد',
        description: `پرونده ${res.returnRequest?.id} ایجاد گردید. به یاد داشته باشید ثبت درخواست منجر به کسر موجودی یا استرداد مالی نمی‌شود.`,
        type: 'success',
      });
    }
  };

  const handleReceiveParcel = (req: ReturnRequest) => {
    const res = receiveReturnParcel(req.id, 'انباردار کارگاه مرکزی شاه‌پوش');
    if (res.success) {
      addToast({
        title: 'بسته مرجوعی در انبار دریافت شد',
        description: 'پرونده جهت کارشناسی فیزیکی و آزمایش عدم شستشو آماده است.',
        type: 'info',
      });
      // Refresh active view
      const updated = state.returnRequests?.find((r) => r.id === req.id);
      if (updated) setActiveRequest(updated);
    }
  };

  const handleSaveInspection = () => {
    if (!activeRequest) return;
    const res = inspectReturnParcel(
      activeRequest.id,
      inspectionOutcome,
      restockEligible,
      inspectionNotes || 'کارشناسی فیزیکی مطابق چک‌لیست تایید گردید.',
      'کارشناس کنترل کیفیت (QC)'
    );
    if (res.success) {
      setInspectModalOpen(false);
      addToast({
        title: 'نتیجه کارشناسی ثبت شد',
        description: `نتیجه آزمون فیزیکی روی پرونده ${activeRequest.id} ذخیره گردید.`,
        type: 'success',
      });
      const updated = state.returnRequests?.find((r) => r.id === activeRequest.id);
      if (updated) setActiveRequest(updated);
    }
  };

  const handleSaveResolution = () => {
    if (!activeRequest) return;
    const res = resolveReturnRequest(
      activeRequest.id,
      resolutionChoice,
      'امور مالی و پشتیبانی شاه‌پوش',
      {
        executeRefund: executeRefundToggle,
        executeRestock: executeRestockToggle,
      }
    );
    if (res.success) {
      setResolveModalOpen(false);
      addToast({
        title: 'پرونده تعیین تکلیف شد',
        description: `اقدام نهایی برای پرونده ${activeRequest.id} اعمال گردید.`,
        type: 'success',
      });
      const updated = state.returnRequests?.find((r) => r.id === activeRequest.id);
      if (updated) setActiveRequest(updated);
    }
  };

  const getStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case 'requested':
        return <Badge label="درخواست ثبت‌شده" variant="neutral" size="sm" />;
      case 'approved_pending_receipt':
        return <Badge label="در انتظار ارسال بسته" variant="warning" size="sm" />;
      case 'received_inspecting':
        return <Badge label="دریافت شده در انبار (درحال کارشناسی)" variant="warning" size="sm" />;
      case 'inspection_passed':
        return <Badge label="تایید کارشناسی فنی ✓" variant="success" size="sm" />;
      case 'inspection_failed':
        return <Badge label="رد کارشناسی فیزیکی" variant="critical" size="sm" />;
      case 'replacement_dispatched':
        return <Badge label="ارسال سفارش جایگزین" variant="brass" size="sm" />;
      case 'refund_processed':
        return <Badge label="استرداد وجه تسویه شد" variant="success" size="sm" />;
      case 'rejected':
      default:
        return <Badge label="رد درخواست" variant="critical" size="sm" />;
    }
  };

  const columns: ColumnDef<ReturnRequest>[] = [
    {
      key: 'id',
      header: 'کد پرونده',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-rose-400">{row.id}</span>
      ),
    },
    {
      key: 'orderId',
      header: 'کد سفارش / خریدار',
      render: (row) => (
        <div className="space-y-0.5">
          <a
            href={`#/admin/sales/orders/${row.orderId}`}
            className="font-mono text-xs text-white hover:text-[#eed29d] hover:underline block"
          >
            {row.orderId}
          </a>
          <span className="text-xs text-stone-400 block">{row.customerName}</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'علت مرجوعی',
      render: (row) => (
        <div className="space-y-1">
          <span className="text-xs font-bold text-stone-200 block">{row.reasonFa}</span>
          {row.isCustomizedGood ? (
            <Badge label="کالای اختصاصی آتلیه (POD)" variant="brass" size="sm" />
          ) : (
            <Badge label="محصول استاندارد کاتالوگ" variant="neutral" size="sm" />
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت بررسی',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'amount',
      header: 'ارزش مرجوعی',
      render: (row) => <MoneyDisplay amount={row.refundAmountTomans || 0} size="xs" />,
    },
    {
      key: 'actions',
      header: 'مدیریت و کارشناسی',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveRequest(row)}
          className="text-xs gap-1.5 text-[#eed29d] border-[#eed29d]/30 hover:bg-[#eed29d]/10"
        >
          <Eye size={14} />
          <span>بررسی و کارشناسی</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="مرجوعی کالا و استرداد وجه"
        description="ساماندهی درخواست‌های بازگشت کالا، کنترل فیزیکی عدم آسیب به پارچه، انطباق با سیاست‌های قراردادی البسه سفارشی و صدور سند معکوس مالی."
      />

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'returns'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <RotateCcw size={16} className={activeTab === 'returns' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>مرجوعی کالا و تعویض</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('refunds')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'refunds'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <CreditCard size={16} className={activeTab === 'refunds' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>استرداد مالی و تسویه پایا</span>
        </button>
      </div>

      {activeTab === 'refunds' ? (
        <RefundsPage />
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کل پرونده‌ها</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(metrics.total)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">کمتر از ۱٪ کل سفارشات</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">درخواست‌های جدید</span>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(metrics.requested)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">نیازمند تایید دریافت</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">در حال کارشناسی</span>
          <div className="text-xl font-black text-[#eed29d] mt-1 font-fanum">
            {toFaDigits(metrics.inspecting)}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">در انبار مرکزی</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تایید کارشناسی QC</span>
          <div className="text-xl font-black text-emerald-400 mt-1 font-fanum">
            {toFaDigits(metrics.passed)}
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">آماده تعیین تکلیف</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تعویض و ارسال مجدد</span>
          <div className="text-xl font-black text-purple-400 mt-1 font-fanum">
            {toFaDigits(metrics.replaced)}
          </div>
          <span className="text-[10px] text-purple-400/80 mt-1 block">اصلاح سایز یا طرح</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">استرداد مالی قطعی</span>
          <div className="text-xl font-black text-rose-400 mt-1 font-fanum">
            {toFaDigits(metrics.refunded)}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">تسویه حساب پایا</span>
        </div>
      </div>

      {/* Filter and Action bar */}
      <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-black/40 p-1 rounded-xl border border-white/10">
            <span className="text-stone-400 px-2">وضعیت:</span>
            {[
              { id: 'all', label: 'همه' },
              { id: 'requested', label: 'درخواست جدید' },
              { id: 'received_inspecting', label: 'درحال کارشناسی' },
              { id: 'inspection_passed', label: 'تایید کارشناسی' },
              { id: 'refund_processed', label: 'استرداد وجه' },
              { id: 'replacement_dispatched', label: 'تعویض شده' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatus === st.id
                    ? 'bg-[#eed29d] text-black font-bold shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="absolute right-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کد مرسوله، سفارش یا نام خریدار..."
              className="pr-9 pl-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs w-64 focus:outline-none focus:border-[#eed29d]"
            />
          </div>
        </div>

        <Button
          variant="brass"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="text-xs gap-1.5"
        >
          <Plus size={16} />
          <span>ثبت درخواست مرجوعی دستی</span>
        </Button>
      </div>

      {/* Main Table */}
      <Table
        data={returnRequests}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="پرونده مرجوعی مطابق با فیلترها یافت نشد."
        onRowClick={(row) => setActiveRequest(row)}
      />

      {/* Request Detail Drawer / Modal */}
      {activeRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-rose-400">
                  {activeRequest.id}
                </span>
                {getStatusBadge(activeRequest.status)}
              </div>
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="text-stone-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Invariant Policy Notice */}
            <div className="p-4 bg-stone-900/80 border border-white/5 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#eed29d] font-bold">
                <FileText size={16} />
                <span>سیاست قراردادی کالاهای این پرونده:</span>
              </div>
              <p className="text-stone-300 leading-relaxed">{activeRequest.policyNotes}</p>
              <div className="text-[11px] text-stone-500 pt-1">
                * ثبت درخواست مرجوعی به تنهایی موجب تغییر موجودی انبار یا سند استرداد بانکی نمی‌شود تا زمانی که کارشناسی فیزیکی تکمیل گردد.
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-400">اقلام مشمول مرجوعی:</h4>
              <div className="divide-y divide-white/5 border border-white/5 rounded-2xl p-3 bg-black/20">
                {activeRequest.items.map((it, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white font-bold block">{it.productName}</span>
                      <span className="font-mono text-stone-400 text-[11px]">SKU: {it.sku}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-white font-bold block font-fanum">
                        {toFaDigits(it.quantity)} عدد
                      </span>
                      <MoneyDisplay amount={it.unitPriceTomans * it.quantity} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Action Buttons */}
            <div className="p-4 bg-stone-900/40 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-400">
                مرحله جاری:{' '}
                <strong className="text-white">{getStatusBadge(activeRequest.status)}</strong>
              </div>

              <div className="flex items-center gap-2">
                {activeRequest.status === 'requested' && (
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={() => handleReceiveParcel(activeRequest)}
                    className="gap-1.5 text-xs"
                  >
                    <Package size={14} />
                    <span>ثبت دریافت بسته فیزیکی در انبار</span>
                  </Button>
                )}

                {activeRequest.status === 'received_inspecting' && (
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={() => setInspectModalOpen(true)}
                    className="gap-1.5 text-xs"
                  >
                    <ShieldCheck size={14} />
                    <span>انجام کارشناسی فنی فیزیکی</span>
                  </Button>
                )}

                {(activeRequest.status === 'inspection_passed' ||
                  activeRequest.status === 'inspection_failed') && (
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={() => setResolveModalOpen(true)}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <CheckCircle2 size={14} />
                    <span>تعیین تکلیف نهایی (تسویه / تعویض)</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-400">دفتر لاگ و حسابرسی رویدادها (Audit Trail):</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(activeRequest.auditTrail || []).map((ad, i) => (
                  <div
                    key={i}
                    className="p-3 bg-stone-900/60 border border-white/5 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-stone-400">
                      <span className="font-bold text-white">{ad.action}</span>
                      <span className="text-[10px] font-fanum">
                        {new Date(ad.timestamp).toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <div className="text-stone-300 text-[11px]">{ad.note}</div>
                    <div className="text-[10px] text-stone-500">ثبت‌شده توسط: {ad.actorName}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <Button variant="ghost" size="sm" onClick={() => setActiveRequest(null)}>
                بستن پنجره
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-rose-400" />
              <span>ثبت درخواست مرجوعی کالا</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300">انتخاب سفارش مشتری:</label>
                <select
                  value={orderSelectId}
                  onChange={(e) => setOrderSelectId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                >
                  {state.orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.customerName} ({toFaDigits(o.totalTomans.toLocaleString())} تومان)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300">علت مرجوعی:</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as ReturnReason)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                >
                  <option value="size_mismatch">عدم تطابق سایز با جدول راهنما</option>
                  <option value="defective_stitching">ایراد در دوخت یا بافت پارچه</option>
                  <option value="print_color_drift">مغایرت تناژ رنگ چاپ آتلیه</option>
                  <option value="customer_remorse">انصراف شخصی (پلمپ دست‌نخورده)</option>
                  <option value="wrong_item_shipped">ارسال مدل اشتباه از انبار</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300">توضیحات تکمیلی علت:</label>
                <input
                  type="text"
                  value={customReasonFa}
                  onChange={(e) => setCustomReasonFa(e.target.value)}
                  placeholder="مثال: درخواست تغییر سایز هودی از L به XL"
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300">یادداشت سیاست قراردادی:</label>
                <textarea
                  rows={2}
                  value={policyNotesInput}
                  onChange={(e) => setPolicyNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setCreateModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleCreateRequest}>
                ثبت پرونده
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectModalOpen && activeRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>کارشناسی فنی و کنترل فیزیکی لباس</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300">نتیجه آزمون عدم شستشو و اصالت لباس:</label>
                <select
                  value={inspectionOutcome}
                  onChange={(e) => setInspectionOutcome(e.target.value as InspectionOutcome)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                >
                  <option value="intact_resellable">سالم، پلمپ و بدون بو/شستشو (قابل عرضه مجدد)</option>
                  <option value="minor_defect_reworkable">نقص جزئی در دوخت یا چاپ (قابل ریوورک در کارگاه)</option>
                  <option value="damaged_scrap">آسیب‌دیده توسط کاربر یا استفاده‌شده (ضایعات)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="restockCheck"
                  checked={restockEligible}
                  onChange={(e) => setRestockEligible(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-[#eed29d] focus:ring-0"
                />
                <label htmlFor="restockCheck" className="text-stone-300 cursor-pointer">
                  مجاز به بازگشت فیزیکی به موجودی قفسه انبار (Restock Eligible)
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300">یادداشت کارشناس QC:</label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="ثبت جزئیات بافت پارچه، بوی عطر، لیبل‌ها..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setInspectModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveInspection}>
                ثبت نتیجه کارشناسی
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && activeRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>تعیین تکلیف نهایی پرونده مرجوعی</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300">روش حل‌وفصل و اقدام اجرایی:</label>
                <select
                  value={resolutionChoice}
                  onChange={(e) => setResolutionChoice(e.target.value as ReturnResolution)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#eed29d]"
                >
                  <option value="exchange_replacement">تعویض کالا و صدور سفارش جایگزین</option>
                  <option value="gateway_refund">استرداد وجه فاکتور به حساب بانکی شبا</option>
                  <option value="store_credit">افزایش اعتبار کیف پول کاربر</option>
                  <option value="rejected">رد قطعی درخواست</option>
                </select>
              </div>

              {resolutionChoice === 'gateway_refund' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="execRefund"
                      checked={executeRefundToggle}
                      onChange={(e) => setExecuteRefundToggle(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-[#eed29d] focus:ring-0"
                    />
                    <label htmlFor="execRefund" className="text-stone-300 cursor-pointer font-bold">
                      صدور سند استرداد در دفتر کل مالی (شبیه‌ساز پایا)
                    </label>
                  </div>
                  <span className="text-[11px] text-stone-400 block">
                    مبلغ استرداد:{' '}
                    <strong className="text-white">
                      {(activeRequest.refundAmountTomans || 0).toLocaleString('fa-IR')} تومان
                    </strong>
                  </span>
                </div>
              )}

              {activeRequest.restockEligible && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="execRestock"
                    checked={executeRestockToggle}
                    onChange={(e) => setExecuteRestockToggle(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-[#eed29d] focus:ring-0"
                  />
                  <label htmlFor="execRestock" className="text-stone-300 cursor-pointer">
                    افزایش فیزیکی موجودی قفسه انبار برای اقلام استاندارد
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setResolveModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveResolution}>
                تایید و اعمال نهایی
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
