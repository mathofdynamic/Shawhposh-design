const orderStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  awaiting_payment: 'در انتظار پرداخت',
  confirmed: 'تأییدشده',
  cancelled: 'لغوشده',
  completed: 'تکمیل‌شده',
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'پرداخت‌نشده',
  pending: 'در حال پرداخت',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  partially_refunded: 'بازپرداخت بخشی',
  refunded: 'بازپرداخت‌شده',
  created: 'ایجادشده',
  awaiting_customer: 'در انتظار مشتری',
  pending_verification: 'در انتظار تأیید',
  verified: 'تأییدشده',
  rejected: 'ردشده',
  expired: 'منقضی‌شده',
};

const fulfillmentStatusLabels: Record<string, string> = {
  unfulfilled: 'آماده‌نشده',
  ready_to_pack: 'آماده بسته‌بندی',
  packed: 'بسته‌بندی‌شده',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  returned: 'مرجوع‌شده',
};

const productStatusLabels: Record<string, string> = {
  active: 'فعال',
  draft: 'پیش‌نویس',
  archived: 'بایگانی‌شده',
};

const stockMovementLabels: Record<string, string> = {
  manual_adjustment: 'اصلاح دستی موجودی',
  reservation: 'رزرو موجودی',
  reservation_release: 'آزادسازی رزرو',
  reservation_expired: 'پایان مهلت رزرو',
  sale_committed: 'ثبت فروش',
};

const orderEventLabels: Record<string, string> = {
  order_created: 'سفارش ثبت شد',
  inventory_reserved: 'موجودی رزرو شد',
  reservation_released: 'رزرو موجودی آزاد شد',
  order_cancelled: 'سفارش لغو شد',
  note_added: 'یادداشت ثبت شد',
  shipping_address_updated: 'نشانی ارسال به‌روزرسانی شد',
  payment_pending: 'پرداخت در انتظار انجام است',
  payment_receipt_submitted: 'رسید پرداخت ارسال شد',
  payment_verified: 'پرداخت تأیید شد',
  payment_rejected: 'پرداخت رد شد',
};

const sizeLabels: Record<string, string> = {
  XS: 'خیلی کوچک',
  S: 'کوچک',
  M: 'متوسط',
  L: 'بزرگ',
  XL: 'خیلی بزرگ',
  XXL: 'دو ایکس‌بزرگ',
  '2XL': 'دو ایکس‌بزرگ',
  '3XL': 'سه ایکس‌بزرگ',
  '4XL': 'چهار ایکس‌بزرگ',
  FREE: 'فری‌سایز',
  'FREE SIZE': 'فری‌سایز',
  'ONE SIZE': 'تک‌سایز',
};

const fitLabels: Record<string, string> = {
  oversize: 'آزاد',
  classic: 'کلاسیک',
  slim: 'جذب',
  oversized: 'لش',
  regular: 'معمولی',
  crop: 'کوتاه',
};

function labelFrom(labels: Record<string, string>, value: string | null | undefined): string {
  return value ? labels[value] ?? 'نامشخص' : 'نامشخص';
}

export const persianOrderStatus = (value: string | null | undefined) => labelFrom(orderStatusLabels, value);
export const persianPaymentStatus = (value: string | null | undefined) => labelFrom(paymentStatusLabels, value);
export const persianFulfillmentStatus = (value: string | null | undefined) => labelFrom(fulfillmentStatusLabels, value);
export const persianProductStatus = (value: string | null | undefined) => labelFrom(productStatusLabels, value);
export const persianStockMovement = (value: string | null | undefined) => labelFrom(stockMovementLabels, value);
export const persianOrderEvent = (value: string | null | undefined) => labelFrom(orderEventLabels, value);
export const persianSize = (value: string | null | undefined) => labelFrom(sizeLabels, value?.trim().toUpperCase());
export const persianFit = (value: string | null | undefined) => labelFrom(fitLabels, value?.trim().toLowerCase());
