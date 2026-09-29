/**
 * Shahpoosh Luxury Streetwear - Order Operations Detail Page
 * Dedicated operational cockpit for `/admin/sales/orders/:id` and `/orders/:id`
 * Mobile-ready (workable at 360px) with transition guards, masked privacy, timelines, and audit trails.
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Clock,
  Printer,
  Ban,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Truck,
  Palette,
  CreditCard,
  Layers,
  Edit3,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  MessageSquare,
  History,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Modal,
  FormField,
  Input,
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
  maskIpAddress,
} from '../../utils/formatters';
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  getOrderType,
  getOrderTypeLabelFa,
  canTransitionOrderStatus,
  detectOrderExceptions,
} from '../../domain/orderStateMachine';
import { DemoInvoiceModal } from '../../components/orders/DemoInvoiceModal';

export interface OrderDetailPageProps {
  orderIdProp?: string;
}

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderIdProp }) => {
  const { currentPath, params, navigate } = useAdminRouter();
  const {
    state,
    getOrderById,
    updateOrderStatus,
    assignOrderOwner,
    updateOrderDeliveryDetails,
    cancelOrderWithReason,
    addOrderStaffNote,
    issueSimulatedRefund,
  } = useAdminRepository();
  const { addToast } = useToast();

  // Extract orderId from props, params, or pathname regex
  const orderId = useMemo(() => {
    if (orderIdProp) return orderIdProp;
    if (params.id) return params.id;
    const parts = currentPath.split('/');
    return parts[parts.length - 1] || '';
  }, [orderIdProp, params.id, currentPath]);

  // Load detailed operational data
  const orderDetails = useMemo(() => {
    if (!orderId) return null;
    return getOrderById(orderId);
  }, [orderId, getOrderById]);

  // Modals & Interactivity States
  const [showMaskedCustomerInfo, setShowMaskedCustomerInfo] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'invoice' | 'packing_slip'>('invoice');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<OrderStatus>('paid_processing');
  const [statusTransitionNotes, setStatusTransitionNotes] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('انصراف مشتری یا عدم تایید کیفیت کالا');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isDeliveryEditModalOpen, setIsDeliveryEditModalOpen] = useState(false);
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editReason, setEditReason] = useState('');
  const [newStaffNote, setNewStaffNote] = useState('');

  if (!orderDetails) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto my-12 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-white/10 flex items-center justify-center mx-auto text-stone-500">
          <ShoppingBag size={28} />
        </div>
        <h2 className="text-lg font-bold text-white">سفارش مورد نظر یافت نشد</h2>
        <p className="text-xs text-stone-400">
          شناسه سفارش <span className="font-mono text-[#eed29d]">{orderId}</span> در پایگاه داده فروشگاه وجود ندارد یا حذف شده است.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/sales/orders')}
          icon={ArrowRight}
        >
          بازگشت به فهرست سفارش‌ها
        </Button>
      </div>
    );
  }

  const { order, customer, payment, shipment, jobs, designs } = orderDetails;
  const orderType = getOrderType(order);
  const activeExceptions = detectOrderExceptions({
    order,
    nowIso: state.demoClockIso,
    payment,
    designs,
    jobs,
    shipment,
    variants: state.variants,
  });

  // Calculate Transition Guard for all potential statuses
  const availableTargetStatuses: OrderStatus[] = [
    'paid_processing',
    'in_production',
    'quality_check',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];

  const transitionEvaluations = useMemo(() => {
    return availableTargetStatuses.map((st) => ({
      status: st,
      ...canTransitionOrderStatus(st, {
        order,
        payment,
        designs,
        jobs,
        shipment,
        variants: state.variants,
      }),
    }));
  }, [order, payment, designs, jobs, shipment, state.variants]);

  // Controlled Status Change Handler
  const handleExecuteStatusTransition = () => {
    const res = updateOrderStatus(
      order.id,
      selectedTargetStatus,
      state.staff[0]?.id || 'STF-01',
      statusTransitionNotes.trim() || undefined
    );

    if (res.success) {
      addToast({
        title: 'وضعیت سفارش بروزرسانی شد',
        description: `وضعیت به «${ORDER_STATUS_CONFIG[selectedTargetStatus].labelFa}» تغییر یافت.`,
        type: 'success',
      });
      setIsStatusModalOpen(false);
      setStatusTransitionNotes('');
    } else {
      addToast({
        title: 'خطای انتقال وضعیت (قانون انضباط)',
        description: res.error || 'این تغییر وضعیت با توجه به وضعیت فعلی مجاز نیست.',
        type: 'error',
      });
    }
  };

  // Cancellation with Reason & Stock Release
  const handleExecuteCancel = () => {
    if (!cancellationReason.trim()) {
      addToast({
        title: 'علت الزامی است',
        description: 'لطفاً علت لغو سفارش را وارد کنید.',
        type: 'error',
      });
      return;
    }

    const res = cancelOrderWithReason(
      order.id,
      cancellationReason.trim(),
      state.staff[0]?.id || 'STF-01'
    );

    if (res.success) {
      addToast({
        title: 'سفارش لغو شد',
        description: 'تعهدات رزرو انبار آزاد شد و سفارش به وضعیت لغو تغییر یافت.',
        type: 'success',
      });
      setIsCancelModalOpen(false);
      setCancellationReason('');
    } else {
      addToast({
        title: 'خطا در لغو',
        description: res.error || 'امکان لغو این سفارش وجود ندارد.',
        type: 'error',
      });
    }
  };

  // Financial Refund Handler
  const handleExecuteRefund = () => {
    const res = issueSimulatedRefund(
      order.id,
      order.totalTomans,
      refundReason.trim(),
      state.staff[0]?.id || 'STF-01'
    );

    if (res.success) {
      addToast({
        title: 'استرداد وجه ثبت شد',
        description: `مبلغ ${toFaDigits(order.totalTomans.toLocaleString())} تومان استرداد گردید.`,
        type: 'success',
      });
      setIsRefundModalOpen(false);
    } else {
      addToast({
        title: 'خطای استرداد وجه',
        description: res.error || 'امکان استرداد برای این سفارش وجود ندارد.',
        type: 'error',
      });
    }
  };

  // Delivery Address Edit Handler
  const handleOpenDeliveryEdit = () => {
    setEditShippingAddress(order.shippingAddress);
    setEditCity(order.city);
    setEditCustomerPhone(order.customerPhone);
    setEditReason('');
    setIsDeliveryEditModalOpen(true);
  };

  const handleSaveDeliveryEdit = () => {
    const res = updateOrderDeliveryDetails(
      order.id,
      {
        shippingAddress: editShippingAddress,
        city: editCity,
        customerPhone: editCustomerPhone,
        reason: editReason,
      },
      state.staff[0]?.id || 'STF-01'
    );

    if (res.success) {
      addToast({
        title: 'نشانی تحویل اصلاح شد',
        description: 'سوابق تغییر در دفترچه ممیزی سفارش ثبت گردید.',
        type: 'success',
      });
      setIsDeliveryEditModalOpen(false);
    } else {
      addToast({
        title: 'خطا در ویرایش نشانی',
        description: res.error || 'اطلاعات ناقص است.',
        type: 'error',
      });
    }
  };

  // Staff Assignment Handler
  const handleAssignOwner = () => {
    if (!selectedOwnerId) return;
    const res = assignOrderOwner(order.id, selectedOwnerId, state.staff[0]?.id || 'STF-01');
    if (res.success) {
      addToast({
        title: 'مسئول پیگیری تخصیص یافت',
        description: 'کارشناس جدید به عنوان ناظر سفارش ثبت شد.',
        type: 'success',
      });
      setIsOwnerModalOpen(false);
    }
  };

  // Staff Note Handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffNote.trim()) return;
    const res = addOrderStaffNote(order.id, newStaffNote.trim(), state.staff[0]?.id || 'STF-01');
    if (res.success) {
      addToast({
        title: 'یادداشت داخلی ثبت شد',
        description: 'یادداشت در پرونده سفارش درج گردید.',
        type: 'success',
      });
      setNewStaffNote('');
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-right" dir="rtl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-3 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/sales/orders')}
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>فروش و سفارشات</span>
          </button>
          <span>/</span>
          <button
            onClick={() => navigate('/admin/sales/orders')}
            className="hover:text-white transition-colors"
          >
            <span>سفارش‌ها</span>
          </button>
          <span>/</span>
          <span className="font-mono text-[#eed29d] font-bold">{order.id}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/sales/orders')}
          icon={ArrowRight}
        >
          بازگشت به فهرست
        </Button>
      </div>

      {/* Top Cockpit Header Card */}
      <div className="p-4 md:p-6 bg-gradient-to-b from-[#1c1917] to-[#121110] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">
                {order.id}
              </h1>
              <Badge
                variant={ORDER_STATUS_CONFIG[order.status]?.badgeVariant || 'default'}
                size="sm"
              >
                {ORDER_STATUS_CONFIG[order.status]?.labelFa || order.status}
              </Badge>
              <Badge
                variant={PAYMENT_STATUS_CONFIG[order.paymentStatus]?.badgeVariant || 'default'}
                size="sm"
              >
                {PAYMENT_STATUS_CONFIG[order.paymentStatus]?.labelFa || order.paymentStatus}
              </Badge>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ba8d3d]/15 text-[#eed29d] border border-[#ba8d3d]/30">
                {getOrderTypeLabelFa(orderType)}
              </span>
              {order.isRushOrder && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  سفارش ویژه فوری (Rush)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 font-fanum">
              <span>ثبت شده در: {formatPersianDate(order.createdAt, { includeTime: true })}</span>
              <span>·</span>
              <span>خریدار: <strong className="text-stone-200">{order.customerName}</strong> ({order.city})</span>
              <span>·</span>
              <span>
                مسئول پیگیری:{' '}
                <strong className="text-[#eed29d]">
                  {order.assignedOwnerName || 'تخصیص‌نیافته'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={() => {
                setInvoiceMode('invoice');
                setIsInvoiceModalOpen(true);
              }}
            >
              پیش‌فاکتور (DEMO)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => {
                setInvoiceMode('packing_slip');
                setIsInvoiceModalOpen(true);
              }}
            >
              برگه خروج انبار
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={UserCheck}
              onClick={() => {
                setSelectedOwnerId(order.assignedOwnerId || state.staff[0]?.id || '');
                setIsOwnerModalOpen(true);
              }}
            >
              تغییر مسئول
            </Button>

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button
                variant="brass"
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  setSelectedTargetStatus(availableTargetStatuses[1]);
                  setIsStatusModalOpen(true);
                }}
              >
                تغییر کنترل‌شده مرحله
              </Button>
            )}

            {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'refunded' && (
              <Button
                variant="destructive"
                size="sm"
                icon={Ban}
                onClick={() => setIsCancelModalOpen(true)}
              >
                لغو سفارش
              </Button>
            )}

            {order.paymentStatus === 'verified_paid' && order.status !== 'refunded' && (
              <Button
                variant="destructive"
                size="sm"
                icon={RotateCcw}
                onClick={() => setIsRefundModalOpen(true)}
              >
                استرداد وجه
              </Button>
            )}
          </div>
        </div>

        {/* Exception Queue Alert if present */}
        {activeExceptions.length > 0 && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <ShieldAlert size={16} />
              <span>موارد استثنا و نیازمند اقدام فوری در این سفارش ({toFaDigits(activeExceptions.length)})</span>
            </div>
            <div className="space-y-1.5 divide-y divide-rose-500/20">
              {activeExceptions.map((exc) => (
                <div key={exc.id} className="pt-1.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="text-stone-300">
                    <strong className="text-rose-300 ml-1.5">{exc.titleFa}:</strong>
                    <span>{exc.descriptionFa}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-stone-400">اقدام: {exc.remediationAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5-Machine Independent Status Flow */}
      <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-stone-300 flex items-center justify-between">
          <span>وضعیت ۵ گانه مستقل (سفارش · پرداخت · طراحی · تولید · ارسال)</span>
          <span className="text-[10px] text-stone-500">جلوگیری هوشمند از تعارضات منطقی کارگاه</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          {/* 1. Order Lifecycle */}
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-stone-400 block">۱. چرخه سفارش</span>
            <div className="font-bold text-white text-xs">{ORDER_STATUS_CONFIG[order.status]?.labelFa}</div>
            <span className="text-[10px] text-stone-500 block font-fanum">مرحله {toFaDigits(ORDER_STATUS_CONFIG[order.status]?.stepIndex >= 0 ? ORDER_STATUS_CONFIG[order.status]?.stepIndex + 1 : '-')} از ۶</span>
          </div>

          {/* 2. Payment Lifecycle */}
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-stone-400 block">۲. تسویه مالی</span>
            <div className="font-bold text-emerald-400 text-xs">
              {PAYMENT_STATUS_CONFIG[order.paymentStatus]?.labelFa}
            </div>
            <span className="text-[10px] text-stone-500 block font-fanum">
              {payment ? `${payment.method === 'saman_gateway' ? 'سامان کیش' : 'زرین‌پال'}` : 'در انتظار شاپرک'}
            </span>
          </div>

          {/* 3. Design Lifecycle */}
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-stone-400 block">۳. وضعیت طرح آتلیه</span>
            <div className="font-bold text-[#eed29d] text-xs">
              {order.hasCustomLineItem
                ? designs[0]?.status === 'approved'
                  ? 'طرح تایید شده'
                  : designs[0]?.status === 'rejected'
                  ? 'طرح رد شده'
                  : 'در انتظار بازبینی'
                : 'بدون طرح (کالای آماده)'}
            </div>
            <span className="text-[10px] text-stone-500 block font-fanum">
              {order.hasCustomLineItem ? `شناسه: ${designs[0]?.id || '---'}` : 'تولید آماده'}
            </span>
          </div>

          {/* 4. Production Lifecycle */}
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-stone-400 block">۴. خط تولید و چاپ</span>
            <div className="font-bold text-amber-300 text-xs">
              {jobs && jobs.length > 0
                ? jobs[0].stage === 'printing_dtg'
                  ? 'در حال چاپ DTG'
                  : jobs[0].stage === 'qc_inspection'
                  ? 'در کنترل کیفیت'
                  : jobs[0].stage === 'completed'
                  ? 'تکمیل تولید'
                  : 'در صف کارگاه'
                : 'بدون نیاز به چاپ'}
            </div>
            <span className="text-[10px] text-stone-500 block font-fanum">
              {jobs && jobs.length > 0 ? `اپراتور: ${jobs[0].operatorId || 'تخصیص اتوماتیک'}` : 'ارسال مستقیم'}
            </span>
          </div>

          {/* 5. Shipping Lifecycle */}
          <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1 col-span-2 md:col-span-1">
            <span className="text-[10px] text-stone-400 block">۵. لجستیک و ارسال</span>
            <div className="font-bold text-white text-xs">
              {shipment
                ? shipment.status === 'dispatched'
                  ? 'تحویل مامور باربری'
                  : shipment.status === 'delivered'
                  ? 'تحویل مشتری'
                  : 'آماده ارسال'
                : 'در انتظار بسته‌بندی'}
            </div>
            <span className="text-[10px] text-stone-500 block font-mono">
              {shipment?.trackingCode ? toFaDigits(shipment.trackingCode) : 'کد رهگیری صادر نشده'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Line Items & Customer Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Line Items, Design Previews & Audit History (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Line Items Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>اقلام فاکتور و وضعیت موجودی تنوع</span>
              <span className="text-xs font-fanum text-stone-400">
                {toFaDigits(order.items.length)} قلم کالا
              </span>
            </h3>

            {/* Invariant Note */}
            <div className="p-2.5 bg-black/40 border border-[#ba8d3d]/20 rounded-xl text-[11px] text-[#eed29d] flex items-center gap-2">
              <Layers size={14} className="text-[#ba8d3d] shrink-0" />
              <span>
                <strong>انضباط موجودی البسه خام:</strong> موجودی فیزیکی این لباس در انبار مرکزی نگهداری می‌شود و با تنوع طرح‌های گرافیکی تکثیر نمی‌شود.
              </span>
            </div>

            <div className="divide-y divide-white/10 overflow-x-auto">
              {order.items.map((item, idx) => {
                const variant = state.variants.find((v) => v.sku === item.variantSku);
                const prod = state.products.find((p) => p.id === item.productId);
                const sellableStock = variant ? Math.max(0, variant.onHandStock - variant.reservedStock) : 0;
                const linkedDesign = designs.find((d) => d.id === item.customDesignId);

                return (
                  <div key={item.id} className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {prod?.images && prod.images[0] ? (
                            <img
                              src={typeof prod.images[0] === 'string' ? prod.images[0] : (prod.images[0] as any)?.url}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag size={20} className="text-[#ba8d3d]" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-white text-xs md:text-sm">
                            {item.productName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400 mt-1 font-fanum">
                            <span className="font-mono text-[#eed29d] font-bold">{item.variantSku}</span>
                            <span>·</span>
                            <span>رنگ: {item.colorName}</span>
                            <span>·</span>
                            <span>سایز: {item.size}</span>
                            <span>·</span>
                            <span>برش: {item.fit}</span>
                          </div>

                          {/* Inventory status pill */}
                          {variant && (
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-fanum">
                              <span className="text-stone-400">موجودی فیزیکی: {toFaDigits(variant.onHandStock)}</span>
                              <span>·</span>
                              <span className="text-amber-400">رزرو شده: {toFaDigits(variant.reservedStock)}</span>
                              <span>·</span>
                              <span className="text-emerald-400">آزاد: {toFaDigits(sellableStock)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-left font-fanum shrink-0">
                        <div className="text-sm font-bold text-white">
                          {formatPriceTomans(item.subtotalTomans)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {toFaDigits(item.quantity)} عدد × {formatPriceTomans(item.unitPriceTomans)}
                        </div>
                      </div>
                    </div>

                    {/* Custom POD Atelier Preview (if customized) */}
                    {item.isCustomPod && linkedDesign && (
                      <div className="p-3 bg-stone-900/90 rounded-xl border border-[#ba8d3d]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0">
                            <img
                              src={linkedDesign.previewUrl}
                              alt={linkedDesign.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-[#eed29d] text-xs">
                              {linkedDesign.title}
                            </div>
                            <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5 font-fanum">
                              <span>رزولوشن: {toFaDigits(linkedDesign.resolutionDpi)} DPI</span>
                              <span>·</span>
                              <span>پروفایل رنگ: {linkedDesign.colorProfile}</span>
                              <span>·</span>
                              <span>ناحیه: {linkedDesign.printZone === 'front_chest' ? 'سینه جلو' : 'پشت لباس'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={linkedDesign.status === 'approved' ? 'success' : linkedDesign.status === 'rejected' ? 'destructive' : 'warning'}
                            size="sm"
                          >
                            {linkedDesign.status === 'approved' ? 'تایید آتلیه' : linkedDesign.status === 'rejected' ? 'رد شده' : 'نیازمند بازبینی'}
                          </Badge>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[10px] py-1 px-2"
                            icon={ExternalLink}
                            onClick={() => navigate('/admin/custom-studio/approval')}
                          >
                            مشاهده در آتلیه
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Timeline & Audit Trail */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History size={16} className="text-[#ba8d3d]" />
                <span>گاه‌شمار تغییرات وضعیت و ممیزی عملیات</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">
                {toFaDigits(order.statusTimeline?.length || 1)} رویداد
              </span>
            </h3>

            <div className="relative border-r-2 border-white/10 pr-4 space-y-4 mr-2">
              {order.statusTimeline && order.statusTimeline.length > 0 ? (
                order.statusTimeline.map((tl, i) => (
                  <div key={tl.id || i} className="relative space-y-1 text-xs">
                    {/* Bullet marker */}
                    <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#ba8d3d] border-2 border-[#141211]" />
                    <div className="flex items-center justify-between gap-2 font-fanum">
                      <div className="font-bold text-white">
                        انتقال از «{ORDER_STATUS_CONFIG[tl.fromStatus as OrderStatus]?.labelFa || tl.fromStatus}» به «{ORDER_STATUS_CONFIG[tl.toStatus as OrderStatus]?.labelFa || tl.toStatus}»
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {formatPersianDate(tl.timestamp, { includeTime: true })}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-300">
                      ثبت توسط: <strong>{tl.actorName}</strong>
                      {tl.note && <span className="mr-2 text-stone-400">({tl.note})</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative space-y-1 text-xs">
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#ba8d3d] border-2 border-[#141211]" />
                  <div className="flex items-center justify-between gap-2 font-fanum">
                    <div className="font-bold text-white">ثبت اولیه سفارش در سامانه</div>
                    <span className="text-[10px] text-stone-400">
                      {formatPersianDate(order.createdAt, { includeTime: true })}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    وضعیت آغازین: {ORDER_STATUS_CONFIG[order.status]?.labelFa || order.status}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Internal Staff Notes Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#ba8d3d]" />
                <span>یادداشت‌های داخلی پرسنل و هماهنگی شیفت</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">
                {toFaDigits(order.staffNotes?.length || 0)} یادداشت
              </span>
            </h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <Input
                value={newStaffNote}
                onChange={(e) => setNewStaffNote(e.target.value)}
                placeholder="ثبت یادداشت جدید در خصوص تماس با مشتری، هماهنگی چاپ یا نکته بسته‌بندی..."
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="brass"
                  size="sm"
                  disabled={!newStaffNote.trim()}
                >
                  ثبت یادداشت در پرونده
                </Button>
              </div>
            </form>

            <div className="space-y-2.5 divide-y divide-white/5">
              {order.staffNotes && order.staffNotes.length > 0 ? (
                order.staffNotes.map((note) => (
                  <div key={note.id} className="pt-2.5 text-xs space-y-1 font-fanum">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span className="text-white font-bold">{note.authorName}</span>
                      <span>{formatPersianDate(note.timestamp, { includeTime: true })}</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed font-sans">{note.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-stone-500">
                  هیچ یادداشت داخلی برای این سفارش ثبت نشده است.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer/Address, Financials, Production & Shipping (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customer & Delivery Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin size={16} className="text-[#ba8d3d]" />
                <span>خریدار و نشانی تحویل مرسوله</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMaskedCustomerInfo(!showMaskedCustomerInfo)}
                className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 transition-colors"
                title="تغییر حالت نمایش امنیتی شماره تماس"
              >
                {showMaskedCustomerInfo ? (
                  <>
                    <Eye size={13} />
                    <span>نمایش کامل</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>ماسک کردن</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{order.customerName}</span>
                {customer?.tag && (
                  <Badge variant="brass" size="sm">
                    {customer.tag === 'vip' ? 'مشتری طلایی (VIP)' : customer.tag === 'wholesale' ? 'خریدار عمده' : 'عادی'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-stone-300 font-fanum" dir="ltr">
                <Phone size={13} className="text-stone-500 shrink-0" />
                <span>
                  {showMaskedCustomerInfo ? maskPhoneNumber(order.customerPhone) : toFaDigits(order.customerPhone)}
                </span>
              </div>

              <div className="flex items-start gap-2 text-stone-300">
                <MapPin size={13} className="text-stone-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white ml-1 font-fanum">{order.city}</strong>
                  <span>{order.shippingAddress}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-[11px] py-1"
                  icon={Edit3}
                  onClick={handleOpenDeliveryEdit}
                >
                  اصلاح نشانی و تلفن
                </Button>
              </div>
            </div>

            {/* Address Edit History */}
            {order.deliveryHistory && order.deliveryHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold text-stone-400 block">
                  تاریخچه اصلاحات نشانی تحویل ({toFaDigits(order.deliveryHistory.length)})
                </span>
                <div className="space-y-2 text-[11px]">
                  {order.deliveryHistory.map((hist, idx) => (
                    <div key={idx} className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
                      <div className="flex justify-between text-[10px] text-stone-400 font-fanum">
                        <span>ثبت: {hist.actorName}</span>
                        <span>{formatPersianDate(hist.timestamp, { includeTime: true })}</span>
                      </div>
                      <div className="text-stone-300">علت: {hist.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard size={16} className="text-[#ba8d3d]" />
              <span>صورت‌حساب و تراکنش درگاه بانکی</span>
            </h3>

            <div className="space-y-2 text-xs font-fanum">
              <div className="flex justify-between text-stone-400">
                <span>جمع کل اقلام:</span>
                <span className="text-white font-bold">{formatPriceTomans(order.subtotalTomans)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>هزینه بسته‌بندی و ارسال:</span>
                <span>{order.shippingFeeTomans === 0 ? 'رایگان' : formatPriceTomans(order.shippingFeeTomans)}</span>
              </div>
              {order.discountTomans > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>تخفیف اعمال‌شده:</span>
                  <span>-{formatPriceTomans(order.discountTomans)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                <span>مبلغ نهایی فاکتور:</span>
                <span className="text-[#eed29d]">{formatPriceTomans(order.totalTomans)}</span>
              </div>
            </div>

            {/* Linked Payment Record */}
            {payment && (
              <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1.5 text-xs font-fanum">
                <span className="text-[10px] text-stone-400 block font-bold">رسید تراکنش شاپرک</span>
                <div className="flex justify-between">
                  <span className="text-stone-400">شماره پیگیری درگاه:</span>
                  <span className="font-mono text-white font-bold">{toFaDigits(payment.traceNumber)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">کد مرجع شاپرک (RRN):</span>
                  <span className="font-mono text-stone-300">{toFaDigits(payment.gatewayRefId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">آدرس IP ثبت تراکنش:</span>
                  <span className="font-mono text-stone-400">{maskIpAddress(payment.maskedIpAddress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">درگاه پذیرنده:</span>
                  <span className="text-stone-300">{payment.method === 'saman_gateway' ? 'سامان کیش (سپ)' : 'زرین‌پال'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Production & QC Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette size={16} className="text-[#ba8d3d]" />
              <span>عملیات کارگاه چاپ و کنترل کیفیت (QC)</span>
            </h3>

            {jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <div key={job.id} className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[#eed29d] font-bold">{job.id}</span>
                    <Badge variant={job.qcStatus === 'passed' ? 'success' : job.qcStatus === 'failed' ? 'destructive' : 'warning'} size="sm">
                      {job.qcStatus === 'passed' ? 'QC تایید شد' : job.qcStatus === 'failed' ? 'QC رد شد' : 'در انتظار بازرسی'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-stone-400 font-fanum text-[11px]">
                    <div>اپراتور چاپ: <strong className="text-stone-200">{job.operatorId || 'شیفت روز'}</strong></div>
                    <div>اولویت: <strong className="text-stone-200">{job.priority === 'rush' ? 'فوری (Rush)' : 'عادی'}</strong></div>
                    <div>دفعات بازچاپ: <strong className="text-stone-200">{toFaDigits(job.reprintCount)}</strong></div>
                    <div>مرحله: <strong className="text-stone-200">{job.stage}</strong></div>
                  </div>

                  {job.qcNotes && (
                    <div className="p-2 bg-black/40 rounded-lg text-stone-300 text-[11px]">
                      <strong>گزارش QC:</strong> {job.qcNotes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-stone-500 bg-stone-900/30 rounded-xl border border-dashed border-white/10">
                این سفارش تماماً شامل کالای آماده بدون نیاز به چاپ سفارشی است.
              </div>
            )}
          </div>

          {/* Shipment Card */}
          <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck size={16} className="text-[#ba8d3d]" />
              <span>اطلاعات بارنامه و لجستیک ارسال</span>
            </h3>

            {shipment ? (
              <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-2 text-xs font-fanum">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">شرکت حمل‌ونقل:</span>
                  <strong className="text-white font-sans">
                    {shipment.carrier === 'tipax' ? 'تیپاکس اکسپرس' : shipment.carrier === 'post_pishtaz' ? 'پست پیشتاز' : 'چاپار'}
                  </strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-400">کد رهگیری بارنامه:</span>
                  <div className="flex items-center gap-1.5 font-mono text-[#eed29d] font-bold">
                    <span>{shipment.trackingCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shipment.trackingCode);
                        addToast({ title: 'کپی شد', description: 'کد رهگیری در کلیپ‌بورد کپی گردید.', type: 'info' });
                      }}
                      className="text-stone-400 hover:text-white"
                      title="کپی کد رهگیری"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-400">تحویل برآوردی:</span>
                  <span className="text-stone-200">{formatPersianDate(shipment.estimatedDeliveryDate)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-400">وضعیت مرسوله:</span>
                  <Badge variant={shipment.status === 'delivered' ? 'success' : 'default'} size="sm">
                    {shipment.status === 'delivered' ? 'تحویل شده' : shipment.status === 'dispatched' ? 'در راه مقصد' : 'صدور بارنامه'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-stone-500 bg-stone-900/30 rounded-xl border border-dashed border-white/10">
                بارنامه پستی پس از اتمام کنترل کیفی و بسته‌بندی در هاردباکس صادر می‌شود.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controlled Status Update Modal with Transition Guards */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="انتقال کنترل‌شده وضعیت سفارش (Transition Guard)"
        description="سیستم از بروز تناقض‌های عملیاتی (مانند ارسال سفارش پرداخت‌نشده یا چاپ طرح تاییدنشده) جلوگیری می‌کند."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsStatusModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={handleExecuteStatusTransition}
              disabled={
                !transitionEvaluations.find((t) => t.status === selectedTargetStatus)?.allowed
              }
            >
              ثبت تغییر وضعیت
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-right font-sans">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white block">وضعیت جدید مورد نظر:</label>
            <div className="space-y-2">
              {transitionEvaluations.map((item) => (
                <label
                  key={item.status}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedTargetStatus === item.status
                      ? 'border-[#ba8d3d] bg-[#ba8d3d]/10'
                      : 'border-white/10 bg-stone-900/50 hover:bg-stone-900'
                  } ${!item.allowed ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="targetStatus"
                      value={item.status}
                      checked={selectedTargetStatus === item.status}
                      disabled={!item.allowed}
                      onChange={() => setSelectedTargetStatus(item.status)}
                      className="mt-0.5 text-[#ba8d3d] focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">
                        {ORDER_STATUS_CONFIG[item.status]?.labelFa}
                      </div>
                      {!item.allowed && item.reason && (
                        <div className="text-[11px] text-rose-400 mt-0.5 leading-relaxed">
                          {item.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-stone-500 font-mono">{item.status}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="یادداشت دلیل تغییر وضعیت (درج در سوابق ممیزی)">
            <Input
              value={statusTransitionNotes}
              onChange={(e) => setStatusTransitionNotes(e.target.value)}
              placeholder="مثلاً: تایید تلفنی با مشتری جهت تغییر به خط چاپ"
            />
          </FormField>
        </div>
      </Modal>

      {/* Cancel Order Modal with mandatory Reason */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="لغو رسمی سفارش و آزادسازی تعهد رزرو انبار"
        description="با لغو سفارش، واحدهای رزرو شده فوراً به موجودی آزاد انبار بازمی‌گردند. این عمل برگشت‌ناپذیر است."
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteCancel}
              disabled={!cancellationReason.trim()}
            >
              تایید قطعی لغو سفارش
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-right font-sans">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 leading-relaxed">
            <strong>قانون انبارداری:</strong> لغو سفارش سبب اصلاح گردش انبار با نوع <code>order_cancellation</code> می‌گردد و از تفکیک مالی استرداد وجه جدا است.
          </div>

          <FormField label="علت رسمی لغو سفارش" required>
            <textarea
              className="w-full bg-[#181614] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 min-h-[80px]"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="مثلاً: انصراف مشتری پیش از شروع فرآیند چاپ / مغایرت در آدرس تحویل"
            />
          </FormField>
        </div>
      </Modal>

      {/* Simulated Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="صدور سند استرداد وجه سفارش (Refund)"
        description="تسویه استرداد مالی به شماره حساب یا کیف پول مشتری با ثبت در دفاتر فروش و گزارشات مالیات."
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsRefundModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteRefund}>
              تایید استرداد ({formatPriceTomans(order.totalTomans)})
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-right font-sans">
          <div className="p-3 bg-stone-900 rounded-xl border border-white/10 space-y-1 text-xs">
            <div className="flex justify-between text-stone-400 font-fanum">
              <span>مبلغ استرداد:</span>
              <strong className="text-white">{formatPriceTomans(order.totalTomans)}</strong>
            </div>
            <div className="flex justify-between text-stone-400 font-fanum">
              <span>خریدار:</span>
              <strong className="text-white">{order.customerName}</strong>
            </div>
          </div>

          <FormField label="علت استرداد وجه" required>
            <Input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="مثلاً: انصراف مشتری طبق قانون ۷ روز ضمانت بازگشت"
            />
          </FormField>
        </div>
      </Modal>

      {/* Assign Owner Modal */}
      <Modal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        title="تخصیص مسئول پیگیری سفارش"
        description="انتخاب همکار ناظر بر خط تولید و هماهنگی لجستیک این سفارش."
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsOwnerModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleAssignOwner}>
              تخصیص مسئول
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-right font-sans">
          <label className="text-xs font-bold text-white block">انتخاب از بین پرسنل کارگاه:</label>
          <div className="space-y-2">
            {state.staff.map((s) => (
              <label
                key={s.id}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedOwnerId === s.id ? 'border-[#ba8d3d] bg-[#ba8d3d]/10' : 'border-white/10 bg-stone-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="owner"
                    value={s.id}
                    checked={selectedOwnerId === s.id}
                    onChange={() => setSelectedOwnerId(s.id)}
                    className="text-[#ba8d3d] focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{s.fullName}</div>
                    <div className="text-[10px] text-stone-400">{s.role}</div>
                  </div>
                </div>

                <Badge variant={s.isOnline ? 'success' : 'default'} size="sm">
                  {s.isOnline ? 'آنلاین' : 'آفلاین'}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit Delivery Details Modal */}
      <Modal
        isOpen={isDeliveryEditModalOpen}
        onClose={() => setIsDeliveryEditModalOpen(false)}
        title="اصلاح نشانی و اطلاعات تحویل مرسوله"
        description="هرگونه ویرایش آدرس همراه با نام کاربر و دلیل در دفترچه ممیزی ذخیره خواهد شد."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsDeliveryEditModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={handleSaveDeliveryEdit}
              disabled={!editReason.trim() || !editShippingAddress.trim()}
            >
              ذخیره و ثبت در دفترچه ممیزی
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-right font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="شهر مقصد" required>
              <Input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="تهران"
              />
            </FormField>

            <FormField label="شماره تلفن تحویل‌گیرنده" required>
              <Input
                value={editCustomerPhone}
                onChange={(e) => setEditCustomerPhone(e.target.value)}
                placeholder="09121234567"
                dir="ltr"
              />
            </FormField>
          </div>

          <FormField label="نشانی پستی کامل" required>
            <textarea
              className="w-full bg-[#181614] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ba8d3d] min-h-[70px]"
              value={editShippingAddress}
              onChange={(e) => setEditShippingAddress(e.target.value)}
              placeholder="تهران، خیابان..."
            />
          </FormField>

          <FormField label="دلیل رسمی اصلاح نشانی (الزامی جهت ممیزی)" required>
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="مثلاً: تماس مشتری و اعلام واحد جدید آپارتمان"
            />
          </FormField>
        </div>
      </Modal>

      {/* Demo Invoice & Packing Slip Modal */}
      <DemoInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={order}
        customer={customer}
        mode={invoiceMode}
      />
    </div>
  );
};
