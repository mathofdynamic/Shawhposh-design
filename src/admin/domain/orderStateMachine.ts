/**
 * Shahpoosh Luxury Streetwear - Order Operations State Machine
 * Independent State Machines, Transition Guards, and Exception Detection
 */

import {
  Order,
  OrderStatus,
  PaymentStatus,
  CustomDesign,
  ProductionJob,
  Shipment,
  PaymentAttempt,
  ProductVariant,
} from './types';

// 1. Core Order Lifecycle Status
export type OrderCoreStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled';

// 2. Payment Lifecycle Status
export type OrderPaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'verified_paid'
  | 'failed'
  | 'partial_refund'
  | 'refunded';

// 3. Design Review Lifecycle Status
export type OrderDesignStatus =
  | 'not_applicable'
  | 'draft'
  | 'submitted'
  | 'review'
  | 'revision'
  | 'approved'
  | 'rejected';

// 4. Production Lifecycle Status
export type OrderProductionStatus =
  | 'none'
  | 'queued'
  | 'in_progress'
  | 'qc'
  | 'ready'
  | 'rework';

// 5. Logistics & Shipping Lifecycle Status
export type OrderShippingStatus =
  | 'unfulfilled'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'exception'
  | 'returned';

// Order Type
export type OrderType = 'standard' | 'custom' | 'mixed';

export function getOrderType(order: Order): OrderType {
  const hasCustom = order.items.some((it) => it.isCustomPod);
  const hasStandard = order.items.some((it) => !it.isCustomPod);
  if (hasCustom && hasStandard) return 'mixed';
  if (hasCustom) return 'custom';
  return 'standard';
}

export function getOrderTypeLabelFa(type: OrderType): string {
  switch (type) {
    case 'custom':
      return 'سفارشی آتلیه (POD)';
    case 'mixed':
      return 'ترکیبی (آماده + سفارشی)';
    case 'standard':
    default:
      return 'کالای آماده';
  }
}

// Map OrderStatus to Core Status
export function mapOrderStatusToCore(status: OrderStatus): OrderCoreStatus {
  switch (status) {
    case 'pending_payment':
      return 'pending';
    case 'paid_processing':
      return 'confirmed';
    case 'in_production':
    case 'quality_check':
    case 'ready_to_ship':
    case 'shipped':
      return 'processing';
    case 'delivered':
      return 'completed';
    case 'cancelled':
    case 'refunded':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function getCoreStatusLabelFa(core: OrderCoreStatus): string {
  switch (core) {
    case 'draft':
      return 'پیش‌نویس';
    case 'pending':
      return 'معلق پرداخت';
    case 'confirmed':
      return 'تایید شده';
    case 'processing':
      return 'در گردش کارگاه';
    case 'completed':
      return 'تکمیل و تحویل';
    case 'cancelled':
      return 'لغو شده';
  }
}

// Persian status labels & badges
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { labelFa: string; badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'brass'; stepIndex: number }
> = {
  pending_payment: { labelFa: 'معلق پرداخت', badgeVariant: 'warning', stepIndex: 0 },
  paid_processing: { labelFa: 'تاییدشده / در صف کارگاه', badgeVariant: 'default', stepIndex: 1 },
  in_production: { labelFa: 'خط چاپ DTG و کارگاه', badgeVariant: 'brass', stepIndex: 2 },
  quality_check: { labelFa: 'کنترل کیفی (QC)', badgeVariant: 'brass', stepIndex: 3 },
  ready_to_ship: { labelFa: 'آماده بسته‌بندی/ارسال', badgeVariant: 'default', stepIndex: 4 },
  shipped: { labelFa: 'ارسال شده با باربری', badgeVariant: 'default', stepIndex: 5 },
  delivered: { labelFa: 'تحویل داده شده', badgeVariant: 'success', stepIndex: 6 },
  cancelled: { labelFa: 'لغو شده', badgeVariant: 'destructive', stepIndex: -1 },
  refunded: { labelFa: 'مسترد شده', badgeVariant: 'destructive', stepIndex: -1 },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { labelFa: string; badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'brass' }
> = {
  initiated: { labelFa: 'درخواست توکن بانکی', badgeVariant: 'warning' },
  pending: { labelFa: 'در انتظار پرداخت', badgeVariant: 'warning' },
  verified_paid: { labelFa: 'پرداخت تاییدشده', badgeVariant: 'success' },
  failed: { labelFa: 'پرداخت ناموفق', badgeVariant: 'destructive' },
  partial_refund: { labelFa: 'استرداد بخشی از وجه', badgeVariant: 'warning' },
  refunded: { labelFa: 'استرداد کامل وجه', badgeVariant: 'destructive' },
};

export interface TransitionGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface TransitionContext {
  order: Order;
  payment?: PaymentAttempt | null;
  designs?: CustomDesign[];
  jobs?: ProductionJob[];
  shipment?: Shipment | null;
  variants?: ProductVariant[];
}

/**
 * Controlled Status Transition Guard
 * Prevents contradictory states (e.g. production of unverified payment, shipping unproduced goods).
 */
export function canTransitionOrderStatus(
  targetStatus: OrderStatus,
  context: TransitionContext
): TransitionGuardResult {
  const { order, payment, designs, jobs } = context;
  const currentStatus = order.status;

  // 1. No self-transition
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: 'سفارش هم‌اکنون در این وضعیت قرار دارد.' };
  }

  // 2. Terminal state immutability
  if (currentStatus === 'cancelled') {
    return { allowed: false, reason: 'سفارش لغو شده و قابل تغییر وضعیت مجدد نیست.' };
  }
  if (currentStatus === 'delivered' && targetStatus !== 'refunded') {
    return { allowed: false, reason: 'سفارش تحویل خریدار شده است و تنها در صورت مرجوعی قابل استرداد است.' };
  }
  if (currentStatus === 'refunded') {
    return { allowed: false, reason: 'وجه این سفارش مسترد شده و پرونده آن بسته است.' };
  }

  // 3. Invariant: Production requires Verified Payment
  const productionStatuses: OrderStatus[] = ['in_production', 'quality_check', 'ready_to_ship', 'shipped'];
  if (productionStatuses.includes(targetStatus)) {
    const isPaid = order.paymentStatus === 'verified_paid' || payment?.status === 'verified_paid';
    if (!isPaid) {
      return {
        allowed: false,
        reason: 'تراکنش پرداخت این سفارش تایید نشده است. ورود سفارش به چرخه چاپ و تولید نیازمند پرداخت قطعی است.',
      };
    }
  }

  // 4. Invariant: POD items require Approved Design before Production
  if (order.hasCustomLineItem && (targetStatus === 'in_production' || targetStatus === 'quality_check')) {
    const activeDesigns = designs || [];
    const hasUnapproved = activeDesigns.some((d) => d.status !== 'approved');
    if (hasUnapproved || activeDesigns.length === 0) {
      return {
        allowed: false,
        reason: 'طرح گرافیکی اختصاصی این سفارش هنوز به تایید آتلیه نرسیده یا نیازمند بازبینی است.',
      };
    }
  }

  // 5. Invariant: Shipping requires production completion
  if (targetStatus === 'shipped') {
    if (currentStatus === 'pending_payment') {
      return { allowed: false, reason: 'سفارش معلق پرداخت امکان صدور بارنامه ندارد.' };
    }
    // If order has production jobs, check that none are currently failing QC
    if (jobs && jobs.length > 0) {
      const failingJob = jobs.find((j) => j.qcStatus === 'failed' || j.stage === 'reprint_needed');
      if (failingJob) {
        return {
          allowed: false,
          reason: 'یکی از اقلام در کنترل کیفی (QC) رد شده و نیاز به چاپ مجدد دارد. پیش از ارسال رفع عیب ضروری است.',
        };
      }
    }
  }

  // 6. Invariant: Delivered requires prior shipment
  if (targetStatus === 'delivered') {
    if (currentStatus !== 'shipped') {
      return {
        allowed: false,
        reason: 'برای علامت‌گذاری به عنوان تحویل‌شده، ابتدا باید وضعیت ارسال بارنامه ثبت شده باشد.',
      };
    }
  }

  // 7. Invariant: Refund separation from cancellation
  if (targetStatus === 'refunded') {
    const isPaid = order.paymentStatus === 'verified_paid' || payment?.status === 'verified_paid';
    if (!isPaid) {
      return {
        allowed: false,
        reason: 'سفارشی که وجه آن دریافت نشده است، قابل استرداد مالی نیست (باید مستقیماً لغو شود).',
      };
    }
  }

  return { allowed: true };
}

// ==========================================
// EXCEPTION QUEUE DEFINITIONS & DETECTION
// ==========================================

export type OrderExceptionType =
  | 'OVERDUE'
  | 'FAILED_PAYMENT'
  | 'MISSING_APPROVED_DESIGN'
  | 'STOCK_INSUFFICIENT'
  | 'DELAYED_SHIPMENT'
  | 'FAILED_PRODUCTION';

export interface OrderException {
  id: string;
  orderId: string;
  type: OrderExceptionType;
  severity: 'critical' | 'high' | 'medium';
  titleFa: string;
  descriptionFa: string;
  remediationAction: string;
  deepLinkPath: string;
  createdAt: string;
}

export function detectOrderExceptions(context: {
  order: Order;
  nowIso: string;
  payment?: PaymentAttempt | null;
  designs?: CustomDesign[];
  jobs?: ProductionJob[];
  shipment?: Shipment | null;
  variants: ProductVariant[];
}): OrderException[] {
  const { order, nowIso, payment, designs, jobs, shipment, variants } = context;
  const exceptions: OrderException[] = [];
  const nowMs = new Date(nowIso).getTime();
  const createdMs = new Date(order.createdAt).getTime();
  const ageHours = (nowMs - createdMs) / (1000 * 3600);

  // 1. Failed Payment
  if (order.paymentStatus === 'failed' || payment?.status === 'failed') {
    exceptions.push({
      id: `EXC-PAY-${order.id}`,
      orderId: order.id,
      type: 'FAILED_PAYMENT',
      severity: 'critical',
      titleFa: 'تراکنش پرداخت ناموفق شاپرک',
      descriptionFa: `پرداخت سفارش ${order.id} توسط درگاه بانکی رد شده است (${payment?.errorMessage || 'خطای تراکنش'}).`,
      remediationAction: 'تماس با مشتری و ارسال پیوند پرداخت مجدد',
      deepLinkPath: `/admin/sales/payments?orderId=${order.id}`,
      createdAt: payment?.createdAt || order.createdAt,
    });
  }

  // 2. Overdue Order (> 48h in pending or unfulfilled)
  if (ageHours > 48 && (order.status === 'pending_payment' || order.status === 'paid_processing')) {
    exceptions.push({
      id: `EXC-OVERDUE-${order.id}`,
      orderId: order.id,
      type: 'OVERDUE',
      severity: 'high',
      titleFa: 'تاخیر در فرآیند سفارش (بیش از ۴۸ ساعت)',
      descriptionFa: `سفارش به مدت بیش از ${Math.round(ageHours)} ساعت در مرحله «${ORDER_STATUS_CONFIG[order.status]?.labelFa || order.status}» متوقف مانده است.`,
      remediationAction: 'تعیین تکلیف فوری یا لغو سفارش معلق',
      deepLinkPath: `/admin/sales/orders/${order.id}`,
      createdAt: order.createdAt,
    });
  }

  // 3. Missing Approved Design for POD items
  if (order.hasCustomLineItem && (order.status === 'paid_processing' || order.status === 'in_production')) {
    const pendingDesign = designs?.find((d) => d.status !== 'approved');
    if (pendingDesign) {
      exceptions.push({
        id: `EXC-DSG-${order.id}`,
        orderId: order.id,
        type: 'MISSING_APPROVED_DESIGN',
        severity: pendingDesign.status === 'rejected' ? 'critical' : 'high',
        titleFa: pendingDesign.status === 'rejected' ? 'طرح سفارشی توسط آتلیه رد شده است' : 'طرح در انتظار تایید کارشناس آتلیه',
        descriptionFa: `طرح «${pendingDesign.title}» نیازمند بازبینی و تایید پیش از شروع چاپ DTG است.`,
        remediationAction: 'بررسی فایل در آتلیه طراحی سفارشی',
        deepLinkPath: `/admin/custom-studio/approval`,
        createdAt: pendingDesign.submittedAt,
      });
    }
  }

  // 4. Failed Production / Quality Check Reject
  if (jobs && jobs.length > 0) {
    const failedJob = jobs.find((j) => j.qcStatus === 'failed' || j.stage === 'reprint_needed');
    if (failedJob) {
      exceptions.push({
        id: `EXC-QC-${order.id}`,
        orderId: order.id,
        type: 'FAILED_PRODUCTION',
        severity: 'high',
        titleFa: 'عدم تایید کنترل کیفیت (QC) و نیاز به چاپ مجدد',
        descriptionFa: `کارگاه تولید برای شناسه ${failedJob.id}: ${failedJob.qcNotes || 'ایراد در تثبیت رنگ یا عیب پارچه'} گزارش کرده است.`,
        remediationAction: 'صدور دستور چاپ مجدد (Rework) به اپراتور',
        deepLinkPath: `/admin/sales/orders/${order.id}`,
        createdAt: order.updatedAt,
      });
    }
  }

  // 5. Stock Insufficient (Physical stock <= 0 or less than reserved)
  for (const item of order.items) {
    const variant = variants.find((v) => v.sku === item.variantSku);
    if (variant) {
      const sellable = Math.max(0, variant.onHandStock - variant.reservedStock);
      if (variant.onHandStock <= 0 || sellable === 0) {
        exceptions.push({
          id: `EXC-STK-${order.id}-${variant.sku}`,
          orderId: order.id,
          type: 'STOCK_INSUFFICIENT',
          severity: 'critical',
          titleFa: `هشدار کسری موجودی فیزیکی (${variant.sku})`,
          descriptionFa: `موجودی آزاد تنوع ${variant.sku} صفر یا ناکافی است (موجودی فیزیکی: ${variant.onHandStock}، رزرو: ${variant.reservedStock}).`,
          remediationAction: 'ثبت رسید ورود کالا یا سفارش خرید از تامین‌کننده',
          deepLinkPath: `/admin/catalog/inventory?sku=${variant.sku}`,
          createdAt: order.updatedAt,
        });
        break; // Only one stock exception per order
      }
    }
  }

  // 6. Delayed Shipment (Dispatched/delivery past expected date)
  if (shipment && (shipment.status === 'in_transit' || shipment.status === 'dispatched')) {
    const estDeliveryMs = new Date(shipment.estimatedDeliveryDate).getTime();
    if (nowMs > estDeliveryMs) {
      exceptions.push({
        id: `EXC-SHP-${order.id}`,
        orderId: order.id,
        type: 'DELAYED_SHIPMENT',
        severity: 'medium',
        titleFa: 'تاخیر در تحویل مرسوله توسط شرکت حمل',
        descriptionFa: `بسته با کد رهگیری ${shipment.trackingCode} از تاریخ تحویل برآوردی (${new Date(shipment.estimatedDeliveryDate).toLocaleDateString('fa-IR')}) گذشته است.`,
        remediationAction: 'استعلام از سامانه تیپاکس/پست و پیگیری باربری',
        deepLinkPath: `/admin/sales/shipping`,
        createdAt: shipment.dispatchedAt || order.updatedAt,
      });
    }
  }

  return exceptions;
}
