/**
 * Shahpoosh Luxury Streetwear - Custom Studio Domain Engine
 * Prompt 12: Independent Review State Machine, Structured Print Rules, Artwork Library, and SLA
 */

import {
  CustomDesign,
  DesignReviewStatus,
  DesignSettings,
  DesignRevisionSnapshot,
  ArtworkAsset,
  PrintRuleZone,
  Order,
  ProductVariant,
} from './types';

/**
 * Standard Workshop Print Zones & Technical Rules
 */
export const DEFAULT_PRINT_RULE_ZONES: PrintRuleZone[] = [
  {
    id: 'front_chest',
    nameFa: 'سینه مرکزی (A3+ Front Chest)',
    maxDimensionsMm: '۳۲۰ × ۴۵۰ میلی‌متر',
    recommendedDimensionsMm: '۲۸۰ × ۳۸۰ میلی‌متر',
    primaryTechnique: 'چاپ دیجیتال مستقیم نساجی (DTG صنعتی Brother GTX Pro)',
    alternativeTechnique: 'سیلک اسکرین پایه آب (برای تیراژ سازمانی بالای ۵۰ عدد)',
    minResolutionDpi: 300,
    allowedFormats: ['SVG', 'PNG', 'PDF', 'AI'],
    transparencyRequired: true,
    colorProfile: 'CMYK',
    safetyMarginMm: 25,
    restrictions: [
      'پس‌زمینه فایل حتماً باید ۱۰۰٪ شفاف (Transparent) باشد.',
      'حداقل ضخامت خطوط طرح برای ثبات چاپ ۰.۵ میلی‌متر است.',
      'فاصله طرح از خط دوخت یقه نباید کمتر از ۷ سانتی‌متر باشد.',
      'حداکثر تراکم مرکب (Total Ink Limit) نباید از ۲۸۰٪ تجاوز کند.',
    ],
  },
  {
    id: 'back_full',
    nameFa: 'پشت کامل کادر بزرگ (A2 Back Full)',
    maxDimensionsMm: '۳۸۰ × ۵۲۰ میلی‌متر',
    recommendedDimensionsMm: '۳۵۰ × ۴۸۰ میلی‌متر',
    primaryTechnique: 'چاپ دیجیتال مستقیم نساجی (DTG Industrial)',
    alternativeTechnique: 'چاپ حرارتی DTF پریمیوم با چسب الاستیک ضد ترک‌خوردگی',
    minResolutionDpi: 300,
    allowedFormats: ['SVG', 'PNG', 'PDF'],
    transparencyRequired: true,
    colorProfile: 'CMYK',
    safetyMarginMm: 30,
    restrictions: [
      'طرح در پایین نباید وارد سجاف دوخت لبه تیشرت شود.',
      'طرح‌های پرکنتراست روی پارچه مشکی نیازمند لایه زیرین سفید دوبل هستند.',
      'رعایت فاصله ۵ سانتی‌متر از خط سرشانه و دوخت یوک پشت الزامی است.',
    ],
  },
  {
    id: 'sleeve_left',
    nameFa: 'روی آستین چپ (Sleeve Badge)',
    maxDimensionsMm: '۹۰ × ۱۲۰ میلی‌متر',
    recommendedDimensionsMm: '۸۰ × ۱۰۰ میلی‌متر',
    primaryTechnique: 'چاپ ترانسفر پلیمری DTF یا گلدوزی میکرو',
    minResolutionDpi: 300,
    allowedFormats: ['SVG', 'PNG'],
    transparencyRequired: true,
    colorProfile: 'CMYK',
    safetyMarginMm: 15,
    restrictions: [
      'طرح آستین نباید روی درز افقی یا خط دوخت مچ قرار گیرد.',
      'طرح‌های بیش از ۴ رنگ بر روی آستین توصیه نمی‌شود.',
    ],
  },
  {
    id: 'collar_minimal',
    nameFa: 'یقه پشتی / نشان مینیمال (Inner/Outer Collar)',
    maxDimensionsMm: '۶۰ × ۶۰ میلی‌متر',
    recommendedDimensionsMm: '۵۰ × ۵۰ میلی‌متر',
    primaryTechnique: 'چاپ سیلک سابلیمیشن یا ترانسفر سیلیکونی ضد حساسیت',
    minResolutionDpi: 300,
    allowedFormats: ['SVG', 'PDF'],
    transparencyRequired: true,
    colorProfile: 'CMYK',
    safetyMarginMm: 10,
    restrictions: [
      'برای چاپ داخلی یقه، مواد مصرفی دارای استاندارد ضدحساسیت OEKO-TEX الزامی است.',
      'فونت‌های کوچک شناسنامه لباس نباید کمتر از ۶ پوینت باشند.',
    ],
  },
];

/**
 * Prebuilt Master Artwork Library Assets
 */
export const DEFAULT_ARTWORK_ASSETS: ArtworkAsset[] = [
  {
    id: 'ART-01',
    title: 'کالیگرافی خط نستعلیق «هیچ مگو»',
    artist: 'استاد امین کریمی',
    attributionFa: 'استودیو خط شاه‌پوش · سبک نستعلیق معاصر تهران',
    license: 'مجوز انحصاری استفاده تجاری و چاپ برند شاه‌پوش (ثبت مالکیت معنوی ۱۴۰۳)',
    category: 'calligraphy',
    categoryLabelFa: 'خوشنویسی و کالیگرافی',
    format: 'SVG Vector Curve / CMYK Certified',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&q=80',
    downloadsCount: 384,
    usageCount: 142,
  },
  {
    id: 'ART-02',
    title: 'کالیگرافی خط ثلث مرکب «عشق» با فرم هندسی',
    artist: 'نگار باقری',
    attributionFa: 'آتلیه تایپوگرافی اصفهان · تلفیق ثلث عثمانی و هندسه ایرانی',
    license: 'حق امتیاز انحصاری خریداری شده جهت تولید البسه استریت‌ویر',
    category: 'contemporary_typography',
    categoryLabelFa: 'تایپوگرافی معاصر',
    format: 'SVG Path / EPS 300 DPI',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80',
    downloadsCount: 512,
    usageCount: 289,
  },
  {
    id: 'ART-03',
    title: 'ایلوستراسیون دروازه تهران قدیم (آرت دکو خیابانی)',
    artist: 'مهرگان منفرد',
    attributionFa: 'استودیو تصویرسازی ری · طراحی وکتور برداری شهری',
    license: 'مجوز لایسنس آزاد تجاری پوشاک لوکس شاه‌پوش',
    category: 'street_miniature',
    categoryLabelFa: 'مینیاتور خیابانی و ایلوستراسیون',
    format: 'SVG Vector / CMYK Proof',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80',
    downloadsCount: 220,
    usageCount: 98,
  },
  {
    id: 'ART-04',
    title: 'خطوط نمادین و هندسه مونوکروم قله دماوند',
    artist: 'سیاوش راد',
    attributionFa: 'آرت دایرکتور شاه‌پوش · کالکشن کوهستان پاییزه',
    license: 'دارایی معنوی اختصاصی برند شاه‌پوش',
    category: 'classic_ornament',
    categoryLabelFa: 'نقوش اساطیری و کهن',
    format: 'SVG Curve Pure Black',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
    downloadsCount: 410,
    usageCount: 175,
  },
  {
    id: 'ART-05',
    title: 'کلاژ ابیات دیوان حافظ و نقوش اسلیمی',
    artist: 'ستاره نیک‌فر',
    attributionFa: 'شیراز · هنر معاصر حروف‌نگاری',
    license: 'مجوز رسمی استفاده در خط تولید پوشاک تیراژ محدود',
    category: 'contemporary_typography',
    categoryLabelFa: 'تایپوگرافی معاصر',
    format: 'SVG / PDF Vector',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=600&q=80',
    downloadsCount: 189,
    usageCount: 64,
  },
  {
    id: 'ART-06',
    title: 'مهر اساطیری شیر و خورشید ساسانی مدرن',
    artist: 'سهراب زارع',
    attributionFa: 'استودیو میراث پارس · بازآفرینی نقوش سیمین اشکانی',
    license: 'تحت مجوز اختصاصی کارگاه شاه‌پوش',
    category: 'street_miniature',
    categoryLabelFa: 'مینیاتور خیابانی و ایلوستراسیون',
    format: 'SVG Vector (300 DPI CMYK)',
    status: 'active',
    previewUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80',
    downloadsCount: 295,
    usageCount: 112,
  },
  // Explicitly marked future customer upload samples
  {
    id: 'ART-UPL-SAMPLE-1',
    title: 'طرح آپلودی آزمایشی خریدار (لوگوی تایپوگرافی شخصی)',
    artist: 'کاربر ناشناس (خریدار شماره ۸۸)',
    attributionFa: 'آپلود مستقیم از فرم وب‌سایت · نمونه آزمایشی',
    license: 'فاقد استعلام کپی‌رایت خارجی · نیازمند بارگذاری مجوز از سوی کاربر',
    category: 'contemporary_typography',
    categoryLabelFa: 'طرح اختصاصی مشتری (آپلود فرضی)',
    format: 'PNG Bitmap (72 DPI غیر استاندارد)',
    status: 'archived',
    previewUrl: 'https://picsum.photos/seed/cust_upl_1/600/600',
    downloadsCount: 1,
    usageCount: 1,
    isCustomerUploadSample: true,
  },
  {
    id: 'ART-UPL-SAMPLE-2',
    title: 'عکس پرتره فرضی کاربر با پس‌زمینه مات',
    artist: 'کاربر آنلاین (خریدار شماره ۹۴)',
    attributionFa: 'بارگذاری فرضی از طریق تلفن همراه',
    license: 'شخصی · نیازمند زیرساخت آپلود/پردازش فایل',
    category: 'street_miniature',
    categoryLabelFa: 'طرح اختصاصی مشتری (آپلود فرضی)',
    format: 'JPEG (نیازمند حذف پس‌زمینه و وکتورایز)',
    status: 'archived',
    previewUrl: 'https://picsum.photos/seed/cust_upl_2/600/600',
    downloadsCount: 0,
    usageCount: 1,
    isCustomerUploadSample: true,
  },
];

/**
 * Structured Print Rule Validator
 * Validates only structured design attributes without pretending to run deep image preflight.
 */
export function validateDesignStructuredRules(
  design: CustomDesign,
  zone: PrintRuleZone
): {
  passed: boolean;
  warnings: string[];
  errors: string[];
  dpiCheck: 'valid' | 'invalid';
  formatCheck: 'valid' | 'invalid';
  scaleCheck: 'valid' | 'invalid';
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DPI Validation
  const dpiCheck = design.resolutionDpi >= zone.minResolutionDpi ? 'valid' : 'invalid';
  if (dpiCheck === 'invalid') {
    errors.push(
      `رزولوشن فایل (${design.resolutionDpi} DPI) کمتر از استاندارد تعیین‌شده چاپخانه (${zone.minResolutionDpi} DPI) است.`
    );
  }

  // 2. Format Validation
  const formatCheck = zone.allowedFormats.includes(design.format) ? 'valid' : 'invalid';
  if (formatCheck === 'invalid') {
    errors.push(
      `فرمت فایل (${design.format}) برای ناحیه ${zone.nameFa} مجاز نیست. فرمت‌های معتبر: ${zone.allowedFormats.join(', ')}`
    );
  }

  // 3. Scale Check
  const scale = design.settings?.designScale || 100;
  const scaleCheck = scale >= 50 && scale <= 150 ? 'valid' : 'invalid';
  if (scaleCheck === 'invalid') {
    errors.push(`مقیاس چاپ (${scale}٪) فراتر از محدوده مجاز ۵۰٪ تا ۱۵۰٪ کادر سینه است.`);
  } else if (scale > 130) {
    warnings.push('مقیاس بزرگتر از ۱۳۰٪ ممکن است در سایزهای کوچک لباس (S و M) نزدیک به لبه درز قرار گیرد.');
  }

  // 4. Color Profile
  if (design.colorProfile !== 'CMYK') {
    warnings.push('طرح در فضای رنگی RGB ثبت شده است. در تبدیل به CMYK پرینتر، ممکن است اشباع رنگی کاهش یابد.');
  }

  // 5. Zone Compatibility
  if (design.printZone !== zone.id) {
    warnings.push(`این طرح برای موقعیت «${design.printZone}» پیکربندی شده، اما با قوانین ناحیه «${zone.nameFa}» مقایسه گردید.`);
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
    dpiCheck,
    formatCheck,
    scaleCheck,
  };
}

/**
 * Returns safe honest response for unsupported deep preflight / print export
 */
export function getUnsupportedFeatureNotice(feature: 'file_export' | 'deep_preflight' | 'copyright_clearance') {
  return {
    supported: false,
    labelFa: 'نیازمند زیرساخت آپلود/پردازش فایل',
    descriptionFa:
      feature === 'file_export'
        ? 'خروجی فایل صنعتی RIP پرینتر نیازمند سرور پردازش گرافیکی و اتصال به موتور Brother GTX است.'
        : feature === 'deep_preflight'
        ? 'اعتبارسنجی دقیق پیکسلی، تراکم ترنسپارنسی و تفکیک لایه‌ها نیازمند زیرساخت پردازش ابری تصویر است.'
        : 'استعلام اصالت حق نشر و کپی‌رایت خارجی فاقد پایگاه‌داده متمرکز آنلاین در محیط دمو است.',
  };
}

/**
 * Calculates Review SLA status
 */
export function calculateReviewSla(
  submittedAtIso: string,
  nowIso: string,
  status: DesignReviewStatus
): {
  slaTargetHours: number;
  hoursElapsed: number;
  status: 'on_track' | 'at_risk' | 'breached' | 'completed';
  labelFa: string;
  badgeVariant: 'success' | 'warning' | 'destructive' | 'default';
  remainingTextFa: string;
} {
  const submitMs = new Date(submittedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  const elapsedMs = Math.max(0, nowMs - submitMs);
  const hoursElapsed = Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10;
  const slaTargetHours = 24; // 24-hour review SLA

  if (status === 'approved' || status === 'rejected') {
    return {
      slaTargetHours,
      hoursElapsed,
      status: 'completed',
      labelFa: 'پایان یافته',
      badgeVariant: 'default',
      remainingTextFa: 'بررسی تکمیل شد',
    };
  }

  const hoursRemaining = slaTargetHours - hoursElapsed;

  if (hoursRemaining < 0) {
    const overdueHours = Math.abs(Math.round(hoursRemaining));
    return {
      slaTargetHours,
      hoursElapsed,
      status: 'breached',
      labelFa: 'نقض SLA (تاخیر)',
      badgeVariant: 'destructive',
      remainingTextFa: `${overdueHours} ساعت تاخیر از مهلت مجاز`,
    };
  }

  if (hoursRemaining <= 6) {
    return {
      slaTargetHours,
      hoursElapsed,
      status: 'at_risk',
      labelFa: 'در آستانه تاخیر',
      badgeVariant: 'warning',
      remainingTextFa: `${Math.round(hoursRemaining)} ساعت تا پایان مهلت`,
    };
  }

  return {
    slaTargetHours,
    hoursElapsed,
    status: 'on_track',
    labelFa: 'در مهلت استاندارد',
    badgeVariant: 'success',
    remainingTextFa: `${Math.round(hoursRemaining)} ساعت باقیمانده`,
  };
}

/**
 * Status visual badge configurations for designs
 */
export const DESIGN_REVIEW_STATUS_CONFIG: Record<
  DesignReviewStatus,
  { labelFa: string; badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'brass'; descriptionFa: string }
> = {
  submitted: {
    labelFa: 'ثبت اولیه طرح',
    badgeVariant: 'warning',
    descriptionFa: 'طرح توسط کاربر در طراح آنلاین ثبت گردیده و در انتظار تخصیص به کارشناس است.',
  },
  under_review: {
    labelFa: 'در صف داوری آتلیه',
    badgeVariant: 'warning',
    descriptionFa: 'طرح در میز کارشناسی طراح گرافیک آتلیه جهت تایید ابعاد و کادربندی قرار دارد.',
  },
  approved: {
    labelFa: 'تایید نهایی آتلیه',
    badgeVariant: 'success',
    descriptionFa: 'کیفیت و تناسبات طرح تایید شد و پس از تسویه فاکتور به صف چاپ منتقل می‌گردد.',
  },
  rejected: {
    labelFa: 'طرح رد شده',
    badgeVariant: 'destructive',
    descriptionFa: 'طرح به دلیل کیفیت پایین، عدم تطابق کادر یا محدودیت فنی چاپخانه رد گردید.',
  },
  revision_requested: {
    labelFa: 'نیازمند اصلاح مشتری',
    badgeVariant: 'warning',
    descriptionFa: 'ایرادات فنی به مشتری اعلام گردیده و آتلیه منتظر بارگذاری نسخه اصلاحی است.',
  },
};
