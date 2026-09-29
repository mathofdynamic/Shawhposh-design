/**
 * Shahpoosh Luxury Streetwear - Shipping, Returns, Moderation & Notifications Domain
 * Prompt 15: Lean Manufacturing Shipping, Returns/Exchange, Review Moderation & Message Simulator
 */

import {
  Shipment,
  ReturnRequest,
  NotificationTemplate,
  SimulatedNotificationLog,
  CarrierName,
} from './types';

export const CARRIER_CONFIG: Record<
  CarrierName,
  {
    nameFa: string;
    deliveryTimeDays: string;
    basePriceTomans: number;
    trackingUrlTemplate: string;
    mockNotice: string;
  }
> = {
  tipax: {
    nameFa: 'تیپاکس اکسپرس هوایی/زمینی',
    deliveryTimeDays: '۱ الی ۲ روز کاری',
    basePriceTomans: 85000,
    trackingUrlTemplate: 'https://tipaxco.com/tracking?id={code}',
    mockNotice: 'وب‌سرویس صدور بارنامه تیپاکس در حالت شبیه‌ساز دمو قرار دارد (فاقد وب‌سرویس برخط در محیط محلی).',
  },
  post_pishtaz: {
    nameFa: 'شرکت ملی پست - پست پیشتاز',
    deliveryTimeDays: '۲ الی ۴ روز کاری',
    basePriceTomans: 55000,
    trackingUrlTemplate: 'https://tracking.post.ir/?id={code}',
    mockNotice: 'سامانه یکپارچه پست و تاپین در محیط توسعه شبیه‌سازی شده است.',
  },
  courier_tehran: {
    nameFa: 'ناوگان پیک اختصاصی شاه‌پوش (ویژه تهران)',
    deliveryTimeDays: 'تحویل ۲ الی ۴ ساعته (روز کاری)',
    basePriceTomans: 110000,
    trackingUrlTemplate: '',
    mockNotice: 'هماهنگی اعزام سفیر اختصاصی کارگاه شاه‌پوش در محدوده مناطق ۲۲ گانه پایتخت.',
  },
  chapar: {
    nameFa: 'کالارسان چاپار اکسپرس',
    deliveryTimeDays: '۱ الی ۳ روز کاری',
    basePriceTomans: 78000,
    trackingUrlTemplate: 'https://chaparnet.com/track/{code}',
    mockNotice: 'درگاه چاپار در حالت شبیه‌ساز محلی فعال است.',
  },
  snapp_box: {
    nameFa: 'اسنپ‌باکس تجاری سریع',
    deliveryTimeDays: 'تحویل فوری همان روز',
    basePriceTomans: 95000,
    trackingUrlTemplate: '',
    mockNotice: 'درگاه API اسنپ‌باکس نیازمند توکن اختصاصی کسب‌وکار در تولید است.',
  },
};

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'TPL-ORD-CONFIRM',
    trigger: 'order_confirmed',
    titleFa: 'تایید ثبت سفارش و صدور پیش‌فاکتور',
    channel: 'sms',
    variables: ['customer_name', 'order_id', 'items_count', 'total_amount'],
    templateText:
      '{customer_name} گرامی؛ سفارش {order_id} حاوی {items_count} قلم کالا به مبلغ {total_amount} تومان در شاه‌پوش ثبت شد. در حال آماده‌سازی و ارسال به خط چاپ/انبار. شاه‌پوش لوکس استریت‌ویر',
    samplePreview:
      'آرمان شریفی گرامی؛ سفارش SHP-1405-882101 حاوی ۲ قلم کالا به مبلغ ۱,۳۹۰,۰۰۰ تومان در شاه‌پوش ثبت شد. در حال آماده‌سازی و ارسال به خط چاپ/انبار. شاه‌پوش لوکس استریت‌ویر',
    mockServiceNotice: 'شبیه‌ساز پیامک درگاه کاوه‌نگار / مگفا (پیامک واقعی ارسال نمی‌شود).',
  },
  {
    id: 'TPL-PAY-VERIFIED',
    trigger: 'payment_verified',
    titleFa: 'تایید پرداخت شاپرک و شروع پردازش سفارش',
    channel: 'sms',
    variables: ['customer_name', 'order_id', 'amount', 'gateway_ref'],
    templateText:
      '{customer_name} عزیز؛ تراکنش پرداخت فاکتور {order_id} به مبلغ {amount} تومان با شماره پیگیری {gateway_ref} در شبکه شاپرک تایید گردید. آتلیه شاه‌پوش',
    samplePreview:
      'سهراب سپهری عزیز؛ تراکنش پرداخت فاکتور SHP-1405-882103 به مبلغ ۲,۱۵۰,۰۰۰ تومان با شماره پیگیری REF-771405 در شبکه شاپرک تایید گردید. آتلیه شاه‌پوش',
    mockServiceNotice: 'الگوی پیامکی خدماتی تایید تراکنش درگاه الکترونیک بانک سامان.',
  },
  {
    id: 'TPL-DESIGN-APPROVED',
    trigger: 'design_approved',
    titleFa: 'تایید هنری و فنی فایل چاپ در آتلیه (POD)',
    channel: 'sms',
    variables: ['customer_name', 'design_title', 'order_id', 'garment_name'],
    templateText:
      '{customer_name} گرامی؛ طرح اختصاصی «{design_title}» برای سفارش {order_id} توسط کارشناس آتلیه تایید و به پرینتر صنعتی DTG ارسال شد. تن‌پوش: {garment_name}. شاه‌پوش',
    samplePreview:
      'مریم میرزاخانی گرامی؛ طرح اختصاصی «کالیگرافی سیمرغ طلایی» برای سفارش SHP-1405-882016 توسط کارشناس آتلیه تایید و به پرینتر صنعتی DTG ارسال شد. تن‌پوش: هودی لش مشکی. شاه‌پوش',
    mockServiceNotice: 'اعلان وضعیت آتلیه چاپ مستقیم نساجی.',
  },
  {
    id: 'TPL-SHIP-DISPATCHED',
    trigger: 'shipment_dispatched',
    titleFa: 'صدور بارنامه و تحویل مرسوله به ناوگان پستی',
    channel: 'sms',
    variables: ['customer_name', 'order_id', 'carrier_name', 'tracking_code', 'estimated_date'],
    templateText:
      '{customer_name} گرامی؛ بسته سفارش {order_id} در جعبه لوکس مشکی شاه‌پوش بسته‌بندی و تحویل {carrier_name} گردید. کد رهگیری: {tracking_code}. تحویل تخمینی: {estimated_date}. پیگیری در سایت.',
    samplePreview:
      'فرهاد مجیدی گرامی؛ بسته سفارش SHP-1405-882027 در جعبه لوکس مشکی شاه‌پوش بسته‌بندی و تحویل تیپاکس اکسپرس هوایی/زمینی گردید. کد رهگیری: TPX-88219405. تحویل تخمینی: ۱۴۰۵/۰۷/۰۵. پیگیری در سایت.',
    mockServiceNotice: 'استعلام وب‌سرویس پستی در حالت دمو شبیه‌سازی است.',
  },
  {
    id: 'TPL-SHIP-EXCEPTION',
    trigger: 'out_for_delivery',
    titleFa: 'هشدار عدم حضور گیرنده / تاخیر در توزیع پستی',
    channel: 'sms',
    variables: ['customer_name', 'tracking_code', 'reason'],
    templateText:
      '{customer_name} عزیز؛ توزیع مرسوله {tracking_code} به علت «{reason}» به نوبت بعد موکول شد. جهت هماهنگی تحویل مجدد با پشتیبانی شاه‌پوش در ارتباط باشید.',
    samplePreview:
      'پریسا نامدار عزیز؛ توزیع مرسوله TPX-7749104 به علت «عدم حضور گیرنده در نشانی ثبت‌شده» به نوبت بعد موکول شد. جهت هماهنگی تحویل مجدد با پشتیبانی شاه‌پوش در ارتباط باشید.',
    mockServiceNotice: 'شبیه‌ساز رخدادهای توزیع ناوگان پستی.',
  },
  {
    id: 'TPL-REFUND-PROCESSED',
    trigger: 'refund_processed',
    titleFa: 'اطلاعیه واریز استرداد وجه فاکتور به شبا',
    channel: 'sms',
    variables: ['customer_name', 'return_id', 'refund_amount', 'tracking_ref'],
    templateText:
      '{customer_name} گرامی؛ استرداد وجه پرونده {return_id} به مبلغ {refund_amount} تومان از طریق چرخه پایا به شماره شبای شما واریز شد. کد پیگیری: {tracking_ref}. امور مالی شاه‌پوش',
    samplePreview:
      'کیوان رستمی گرامی؛ استرداد وجه پرونده RET-102 به مبلغ ۸۹۰,۰۰۰ تومان از طریق چرخه پایا به شماره شبای شما واریز شد. کد پیگیری: PAYA-992014. امور مالی شاه‌پوش',
    mockServiceNotice: 'شبیه‌ساز حواله بانکی پایا/ساتنا.',
  },
];

/**
 * Validates template variable placeholders and renders output text
 */
export function renderNotificationTemplate(
  template: NotificationTemplate,
  variables: Record<string, string | number>
): {
  renderedText: string;
  isValid: boolean;
  missingVariables: string[];
} {
  const missing: string[] = [];
  let rendered = template.templateText;

  for (const varName of template.variables) {
    const val = variables[varName];
    if (val === undefined || val === null || val === '') {
      missing.push(varName);
    } else {
      const reg = new RegExp(`\\{${varName}\\}`, 'g');
      rendered = rendered.replace(reg, String(val));
    }
  }

  return {
    renderedText: rendered,
    isValid: missing.length === 0,
    missingVariables: missing,
  };
}

/**
 * Default Seed Return Requests conforming to customized vs standard garment policies
 */
export const DEFAULT_RETURN_REQUESTS: ReturnRequest[] = [
  {
    id: 'RET-101',
    orderId: 'SHP-1405-882016',
    customerId: 'CUST-1013',
    customerName: 'سهراب سپهری',
    customerPhone: '09121234567',
    items: [
      {
        sku: 'SP107-OVR-BLK-L',
        productName: 'هودی لش کالیگرافی «مولانا»',
        quantity: 1,
        unitPriceTomans: 920000,
        isCustomPod: true,
        reason: 'عدم تطابق سایز عرض سرشانه نسبت به جدول راهنمای سایزبندی',
      },
    ],
    reason: 'size_mismatch',
    reasonFa: 'عدم انطباق سایز نسبت به ابعاد اعلامی جدول تن‌پوش',
    status: 'received_inspecting',
    requestedAt: '2026-09-20T10:15:00.000Z',
    receivedAt: '2026-09-22T14:30:00.000Z',
    inspectedAt: undefined,
    inspectionOutcome: undefined,
    restockEligible: undefined,
    resolution: undefined,
    isCustomizedGood: true,
    policyNotes:
      'کالای اختصاصی آتلیه: طبق سیاست کارگاه، مرجوعی کالای سفارشی در صورت عدم تطابق ابعادی با جدول سایز، مشمول تعویض و اصلاح چاپ در کارگاه است.',
    refundAmountTomans: 920000,
    auditTrail: [
      {
        timestamp: '2026-09-20T10:15:00.000Z',
        actorName: 'مشتری (از طریق پورتال پشتیبانی)',
        action: 'ثبت درخواست مرجوعی و تغییر سایز',
        note: 'درخواست تغییر سایز هودی از L به XL',
      },
      {
        timestamp: '2026-09-21T09:00:00.000Z',
        actorName: 'کارشناس خدمات پس از فروش',
        action: 'تایید ارسال بسته به آدرس کارگاه مرکزی',
        note: 'کد پستی انبار مرجوعی برای مشتری پیامک شد',
      },
      {
        timestamp: '2026-09-22T14:30:00.000Z',
        actorName: 'انباردار کارگاه',
        action: 'دریافت بسته فیزیکی از پست',
        note: 'بسته سالم دریافت شد؛ در صف کارشناسی عدم شستشو و بوی عطر',
      },
    ],
  },
  {
    id: 'RET-102',
    orderId: 'SHP-1405-882027',
    customerId: 'CUST-1005',
    customerName: 'پریسا نامدار',
    customerPhone: '09129876543',
    items: [
      {
        sku: 'SP101-OVR-BLK-M',
        productName: 'تیشرت اورسایز ۲۴۰ گرم پنبه سوپر',
        quantity: 1,
        unitPriceTomans: 550000,
        isCustomPod: false,
        reason: 'ایراد در دوخت سرشانه چپ و بیرون‌زدگی نخ بافت',
      },
    ],
    reason: 'defective_stitching',
    reasonFa: 'ایراد در دوخت و بافت پارچه پنبه سوپر',
    status: 'inspection_passed',
    requestedAt: '2026-09-18T16:20:00.000Z',
    receivedAt: '2026-09-21T11:00:00.000Z',
    inspectedAt: '2026-09-21T15:45:00.000Z',
    inspectionOutcome: 'minor_defect_reworkable',
    restockEligible: false,
    resolution: 'exchange_replacement',
    linkedReplacementOrderId: 'SHP-1405-882199',
    isCustomizedGood: false,
    policyNotes: 'کالای استاندارد کاتالوگ: مشمول ضمانت تعویض کامل ۷ روزه شاه‌پوش با هزینه ارسال رایگان.',
    refundAmountTomans: 550000,
    auditTrail: [
      {
        timestamp: '2026-09-18T16:20:00.000Z',
        actorName: 'مشتری',
        action: 'ثبت درخواست نقص فنی در دوخت',
      },
      {
        timestamp: '2026-09-21T15:45:00.000Z',
        actorName: 'کارشناس کنترل کیفیت (QC)',
        action: 'کارشناسی فیزیکی لباس',
        note: 'نقص دوخت تایید شد؛ لباس غیراستفاده است و تعویض تایید گردید.',
      },
    ],
  },
  {
    id: 'RET-103',
    orderId: 'SHP-1405-882071',
    customerId: 'CUST-1002',
    customerName: 'فرهاد مجیدی',
    customerPhone: '09125551234',
    items: [
      {
        sku: 'SP108-SLM-NVY-L',
        productName: 'تیشرت اسلیم فیت «سیمرغ عطار»',
        quantity: 1,
        unitPriceTomans: 585000,
        isCustomPod: false,
        reason: 'انصراف خریدار به دلیل مسافرت پیش‌بینی‌نشده',
      },
    ],
    reason: 'customer_remorse',
    reasonFa: 'انصراف شخصی خریدار (پک پلمپ و جعبه دست‌نخورده)',
    status: 'refund_processed',
    requestedAt: '2026-09-15T09:30:00.000Z',
    receivedAt: '2026-09-17T12:00:00.000Z',
    inspectedAt: '2026-09-17T14:00:00.000Z',
    inspectionOutcome: 'intact_resellable',
    restockEligible: true,
    resolution: 'gateway_refund',
    linkedRefundId: 'REF-801',
    isCustomizedGood: false,
    policyNotes: 'کالای استاندارد پلمپ: استرداد وجه کامل به شبا پس از کسر هزینه حمل رفت.',
    refundAmountTomans: 585000,
    auditTrail: [
      {
        timestamp: '2026-09-15T09:30:00.000Z',
        actorName: 'مشتری',
        action: 'ثبت انصراف از خرید',
      },
      {
        timestamp: '2026-09-17T14:00:00.000Z',
        actorName: 'انباردار',
        action: 'تایید اصالت پلمپ و بازگردانی ۱ عدد به موجودی قفسه انبار',
      },
      {
        timestamp: '2026-09-18T10:00:00.000Z',
        actorName: 'امور مالی',
        action: 'تسویه سند استرداد پایا',
        note: 'واریز به شماره شبای تاییدشده مشتری',
      },
    ],
  },
];
